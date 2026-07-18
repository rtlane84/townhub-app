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
  sanitizeLocalStoredFilename,
  saveMediaFile,
} from "../lib/media-storage";
import {
  optimizeMediaImage,
  parseOptimizedFormat,
  parseOptimizedQuality,
  parseOptimizedWidth,
} from "../lib/media-optimize";
import { validateUploadedImageBuffer } from "../lib/media-image-validate";
import { logOperationalFailure } from "../lib/operational-log";
import { listOwnedBusinessIds } from "../lib/business-access";
import {
  mediaScopeToBusinessId,
  resolveOwnerMediaBusinessId,
  type ResolvedMediaScope,
} from "../lib/media-scope";
import {
  signLocalMediaFileUrl,
  verifyLocalMediaFileAccess,
} from "../lib/local-media-url";

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

async function resolveMediaScope(
  req: Request,
  options: { allowBodyBusinessId?: boolean } = {},
): Promise<MediaScope | null> {
  if (!req.dbUser) return null;

  let requestedBusinessId = parseRequestedBusinessId(req.query.businessId);
  if (options.allowBodyBusinessId !== false && req.dbUser.role !== "BUSINESS_OWNER") {
    requestedBusinessId ??= parseRequestedBusinessId(req.body?.businessId);
  }

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

function publicMediaUrl(row: typeof mediaAssetsTable.$inferSelect): string {
  if (getMediaStorageBackend() !== "local") {
    return row.url;
  }
  const filename = sanitizeLocalStoredFilename(path.basename(row.storedFilename));
  if (!filename) return row.url;
  return signLocalMediaFileUrl(filename);
}

function serializeMediaAsset(row: typeof mediaAssetsTable.$inferSelect) {
  return {
    id: row.id,
    businessId: row.businessId,
    uploadedByUserId: row.uploadedByUserId,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    url: publicMediaUrl(row),
    createdAt: row.createdAt,
  };
}

// GET /api/media/optimize — on-the-fly resize + modern format delivery for TownHub media URLs
router.get("/media/optimize", async (req, res): Promise<void> => {
  const sourceUrl = typeof req.query.src === "string" ? req.query.src.trim() : "";
  const width = parseOptimizedWidth(req.query.w);
  const format = parseOptimizedFormat(req.query.fm);

  if (!sourceUrl || width == null || format == null) {
    res.status(400).json({ error: "Query params src, w, and fm (webp|avif|jpeg) are required." });
    return;
  }

  const quality = parseOptimizedQuality(req.query.q);

  try {
    const optimized = await optimizeMediaImage({
      sourceUrl,
      width,
      format,
      quality,
    });

    res.setHeader("Content-Type", optimized.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Vary", "Accept");
    res.send(optimized.buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimization failed";
    const status = message === "Unsupported media source URL" ? 400 : 404;
    res.status(status).json({ error: message });
  }
});

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
      error: "Media file is not available from this endpoint.",
    });
    return;
  }

  const filename = sanitizeLocalStoredFilename(req.params.filename);
  if (!filename) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const exp = typeof req.query.exp === "string" ? req.query.exp : undefined;
  const sig = typeof req.query.sig === "string" ? req.query.sig : undefined;
  if (!verifyLocalMediaFileAccess(filename, exp, sig)) {
    res.status(403).json({ error: "Invalid or expired media access link." });
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
    res.setHeader("Cache-Control", "private, max-age=3600");
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
  (req, res, next) => requireAuth(req, res, next),
  mediaUploadSingle,
  async (req, res): Promise<void> => {
    const scope = await resolveMediaScope(req, { allowBodyBusinessId: false });
    if (!scope) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided. Use multipart field \"file\"." });
      return;
    }

    const contentType = file.mimetype;
    const imageValidation = await validateUploadedImageBuffer(file.buffer, contentType);
    if (!imageValidation.ok) {
      res.status(400).json({ error: imageValidation.error });
      return;
    }

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
