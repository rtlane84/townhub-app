import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { db, mediaAssetsTable, businessesTable } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import {
  ListMediaAssetsQueryParams,
  DeleteMediaAssetParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { mediaUploadSingle } from "../middlewares/mediaUpload";
import {
  deleteMediaFile,
  getMediaStorageBackend,
  getMediaUploadDir,
  isAllowedImageMimeType,
  sanitizeLocalStoredFilename,
  saveMediaFile,
} from "../lib/media-storage";
import { logOperationalFailure } from "../lib/operational-log";
import { listOwnedBusinessIds } from "../lib/business-access";
import {
  mediaScopeToBusinessId,
  resolveOwnerMediaBusinessId,
  type ResolvedMediaScope,
} from "../lib/media-scope";

const router: IRouter = Router();

type MediaScope = { businessId: number | null };

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function parseRequestedBusinessId(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const id = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

async function resolveMediaScope(req: Request): Promise<MediaScope | null> {
  if (!req.dbUser) return null;

  const requestedBusinessId =
    parseRequestedBusinessId(req.query.businessId) ??
    parseRequestedBusinessId(req.body?.businessId);

  const ownedBusinessIds =
    req.dbUser.role === "BUSINESS_OWNER"
      ? await listOwnedBusinessIds(req.dbUser.id)
      : [];

  const resolved: ResolvedMediaScope | null = resolveOwnerMediaBusinessId({
    role: req.dbUser.role,
    ownedBusinessIds,
    requestedBusinessId,
  });

  if (!resolved) return null;

  if (resolved.kind === "platform") {
    return { businessId: null };
  }

  const [business] = await db
    .select({ archivedAt: businessesTable.archivedAt })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, resolved.businessId),
        isNull(businessesTable.archivedAt),
      ),
    );

  if (!business) return null;

  return { businessId: resolved.businessId };
}

function requireMediaAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, async () => {
    const scope = await resolveMediaScope(req);
    if (!scope) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as Request & { mediaScope?: MediaScope }).mediaScope = scope;
    next();
  });
}

function serializeMediaAsset(row: typeof mediaAssetsTable.$inferSelect) {
  return {
    id: row.id,
    businessId: row.businessId,
    uploadedByUserId: row.uploadedByUserId,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    url: row.url,
    createdAt: row.createdAt,
  };
}

// GET /api/media/files/:filename — legacy local-dev file serving only
router.get("/media/files/:filename", async (req, res): Promise<void> => {
  if (getMediaStorageBackend() !== "local") {
    const filename = sanitizeLocalStoredFilename(req.params.filename);
    if (filename) {
      const [asset] = await db
        .select({ url: mediaAssetsTable.url })
        .from(mediaAssetsTable)
        .where(eq(mediaAssetsTable.storedFilename, filename));
      if (asset?.url.startsWith("http")) {
        res.redirect(302, asset.url);
        return;
      }
    }
    res.status(404).json({
      error: "Media is served from Supabase Storage. Configure SUPABASE_* env vars and re-upload if needed.",
    });
    return;
  }

  const filename = sanitizeLocalStoredFilename(req.params.filename);
  if (!filename) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(getMediaUploadDir(), filename);
  try {
    const buffer = await readFile(filePath);
    const [asset] = await db
      .select({ mimeType: mediaAssetsTable.mimeType })
      .from(mediaAssetsTable)
      .where(eq(mediaAssetsTable.storedFilename, filename));
    res.setHeader("Content-Type", asset?.mimeType ?? "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

// GET /api/media — list assets for current scope
router.get("/media", requireMediaAccess, async (req, res): Promise<void> => {
  const query = ListMediaAssetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const scope = (req as Request & { mediaScope: MediaScope }).mediaScope;
  const limit = query.data.limit ?? 100;

  const rows = await db
    .select()
    .from(mediaAssetsTable)
    .where(
      scope.businessId == null
        ? isNull(mediaAssetsTable.businessId)
        : eq(mediaAssetsTable.businessId, scope.businessId),
    )
    .orderBy(desc(mediaAssetsTable.createdAt))
    .limit(limit);

  res.json(rows.map(serializeMediaAsset));
});

// POST /api/media/upload — multipart/form-data (field name: file)
router.post(
  "/media/upload",
  requireMediaAccess,
  mediaUploadSingle,
  async (req, res): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided. Use multipart field \"file\"." });
      return;
    }

    const contentType = file.mimetype;
    if (!isAllowedImageMimeType(contentType)) {
      res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." });
      return;
    }

    const scope = (req as Request & { mediaScope: MediaScope }).mediaScope;
    const buffer = file.buffer;

    let saved: Awaited<ReturnType<typeof saveMediaFile>>;
    try {
      saved = await saveMediaFile(buffer, contentType, scope);
    } catch (err) {
      logOperationalFailure("storage_upload_failed", {
        businessId: scope.businessId,
        mimeType: contentType,
        byteSize: buffer.length,
      });
      req.log.error({ err }, "Media upload failed");
      res.status(500).json({
        error: err instanceof Error ? err.message : "Upload failed",
      });
      return;
    }

    const [row] = await db
      .insert(mediaAssetsTable)
      .values({
        businessId: scope.businessId,
        uploadedByUserId: req.dbUser!.id,
        storedFilename: saved.storedFilename,
        originalFilename: file.originalname || "upload",
        mimeType: contentType,
        byteSize: saved.byteSize,
        url: saved.url,
      })
      .returning();

    res.status(201).json(serializeMediaAsset(row));
  },
);

// DELETE /api/media/:id
router.delete("/media/:id", requireMediaAccess, async (req, res): Promise<void> => {
  const params = DeleteMediaAssetParams.safeParse({ id: parseId(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const scope = (req as Request & { mediaScope: MediaScope }).mediaScope;

  const [existing] = await db
    .select()
    .from(mediaAssetsTable)
    .where(
      and(
        eq(mediaAssetsTable.id, params.data.id),
        scope.businessId == null
          ? isNull(mediaAssetsTable.businessId)
          : eq(mediaAssetsTable.businessId, scope.businessId),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Media asset not found" });
    return;
  }

  try {
    await deleteMediaFile(existing.storedFilename);
  } catch (err) {
    req.log.warn({ err, mediaId: existing.id }, "Storage delete failed; removing DB row");
  }

  await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id, existing.id));
  res.status(204).send();
});

export { resolveMediaScope, mediaScopeToBusinessId };

export default router;
