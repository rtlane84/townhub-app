import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type MediaStorageBackend = "supabase" | "local";

export function getMediaStorageBackend(): MediaStorageBackend {
  if (process.env.MEDIA_STORAGE === "local") {
    return "local";
  }
  return "supabase";
}

export function isAllowedImageMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

export interface MediaScope {
  businessId: number | null;
}

function buildStoragePath(scope: MediaScope, mimeType: string): string {
  const filename = `${randomUUID()}${extensionForMimeType(mimeType)}`;
  const prefix = scope.businessId == null ? "platform" : `business-${scope.businessId}`;
  return `${prefix}/${filename}`;
}

// ─── Supabase Storage (default) ─────────────────────────────────────────────

function requireSupabaseEnv(): {
  url: string;
  serviceRoleKey: string;
  bucket: string;
} {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!url || !serviceRoleKey || !bucket) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET in .env. For local dev without Supabase, set MEDIA_STORAGE=local (not recommended for production).",
    );
  }
  return { url, serviceRoleKey, bucket };
}

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  const { url, serviceRoleKey } = requireSupabaseEnv();
  supabaseClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

export function supabasePublicUrl(storagePath: string): string {
  const { url, bucket } = requireSupabaseEnv();
  const base = url.replace(/\/$/, "");
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

async function saveMediaFileSupabase(
  buffer: Buffer,
  mimeType: string,
  scope: MediaScope,
): Promise<{ storedFilename: string; byteSize: number; url: string }> {
  const { bucket } = requireSupabaseEnv();
  const storagePath = buildStoragePath(scope, mimeType);
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return {
    storedFilename: storagePath,
    byteSize: buffer.length,
    url: supabasePublicUrl(storagePath),
  };
}

async function deleteMediaFileSupabase(storedFilename: string): Promise<void> {
  const { bucket } = requireSupabaseEnv();
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).remove([storedFilename]);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

// ─── Local filesystem (opt-in dev fallback only) ─────────────────────────────

export function getMediaUploadDir(): string {
  return process.env.MEDIA_UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
}

function localPublicMediaUrl(storedFilename: string): string {
  return `/api/media/files/${storedFilename}`;
}

async function ensureUploadDir(): Promise<string> {
  const dir = getMediaUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

async function saveMediaFileLocal(
  buffer: Buffer,
  mimeType: string,
  scope: MediaScope,
): Promise<{ storedFilename: string; byteSize: number; url: string }> {
  const dir = await ensureUploadDir();
  const storagePath = buildStoragePath(scope, mimeType);
  const storedFilename = path.basename(storagePath);
  const filePath = path.join(dir, storedFilename);
  await writeFile(filePath, buffer);
  return {
    storedFilename,
    byteSize: buffer.length,
    url: localPublicMediaUrl(storedFilename),
  };
}

async function deleteMediaFileLocal(storedFilename: string): Promise<void> {
  const filePath = path.join(getMediaUploadDir(), path.basename(storedFilename));
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone; DB row is still removed.
  }
}

export function sanitizeLocalStoredFilename(raw: string): string | null {
  const base = path.basename(raw);
  if (!base || base !== raw || base.includes("..")) return null;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(base)) return null;
  return base;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function saveMediaFile(
  buffer: Buffer,
  mimeType: string,
  scope: MediaScope,
): Promise<{ storedFilename: string; byteSize: number; url: string }> {
  if (getMediaStorageBackend() === "local") {
    return saveMediaFileLocal(buffer, mimeType, scope);
  }
  return saveMediaFileSupabase(buffer, mimeType, scope);
}

export async function deleteMediaFile(storedFilename: string): Promise<void> {
  if (getMediaStorageBackend() === "local") {
    await deleteMediaFileLocal(storedFilename);
    return;
  }
  await deleteMediaFileSupabase(storedFilename);
}
