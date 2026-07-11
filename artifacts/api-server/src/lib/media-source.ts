import path from "node:path";
import { sanitizeLocalStoredFilename } from "./media-storage";

export type ResolvedMediaSource =
  | { kind: "supabase"; storagePath: string }
  | { kind: "local"; storedFilename: string };

function decodePathSegments(encodedPath: string): string {
  return encodedPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function resolveSupabaseStoragePathFromUrl(
  sourceUrl: string,
  supabaseUrl: string,
  bucket: string,
): string | null {
  const base = supabaseUrl.replace(/\/$/, "");
  const prefix = `${base}/storage/v1/object/public/${bucket}/`;
  if (!sourceUrl.startsWith(prefix)) return null;

  const storagePath = decodePathSegments(sourceUrl.slice(prefix.length));
  if (!storagePath || storagePath.includes("..")) return null;
  return storagePath;
}

export function resolveLocalStoredFilenameFromUrl(sourceUrl: string): string | null {
  let pathname = sourceUrl;
  try {
    if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
      pathname = new URL(sourceUrl).pathname;
    }
  } catch {
    return null;
  }

  const match = pathname.match(/^\/api\/media\/files\/([^/]+)$/);
  if (!match) return null;
  return sanitizeLocalStoredFilename(match[1]);
}

export function resolveMediaSource(sourceUrl: string): ResolvedMediaSource | null {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return null;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (supabaseUrl && bucket) {
    const storagePath = resolveSupabaseStoragePathFromUrl(trimmed, supabaseUrl, bucket);
    if (storagePath) {
      return { kind: "supabase", storagePath };
    }
  }

  const storedFilename = resolveLocalStoredFilenameFromUrl(trimmed);
  if (storedFilename) {
    return { kind: "local", storedFilename };
  }

  return null;
}

export function localMediaFilePath(storedFilename: string): string {
  const uploadDir = process.env.MEDIA_UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
  return path.join(uploadDir, storedFilename);
}
