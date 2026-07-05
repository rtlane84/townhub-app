import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { getSupabaseClientForMedia } from "./media-fetch";
import { localMediaFilePath, resolveMediaSource, type ResolvedMediaSource } from "./media-source";

export type OptimizedImageFormat = "webp" | "avif" | "jpeg";

const MAX_OUTPUT_WIDTH = 2560;
const DEFAULT_QUALITY = 85;

export function parseOptimizedWidth(raw: unknown): number | null {
  const width = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(width) || width < 1) return null;
  return Math.min(Math.round(width), MAX_OUTPUT_WIDTH);
}

export function parseOptimizedFormat(raw: unknown): OptimizedImageFormat | null {
  if (raw === "webp" || raw === "avif" || raw === "jpeg") return raw;
  return null;
}

export function parseOptimizedQuality(raw: unknown): number {
  const quality = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(quality)) return DEFAULT_QUALITY;
  return Math.min(95, Math.max(50, Math.round(quality)));
}

async function readMediaBytes(source: ResolvedMediaSource): Promise<Buffer> {
  if (source.kind === "local") {
    return readFile(localMediaFilePath(source.storedFilename));
  }

  const supabase = getSupabaseClientForMedia();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) {
    throw new Error("Supabase bucket is not configured");
  }

  const { data, error } = await supabase.storage.from(bucket).download(source.storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download media");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function optimizeMediaImage(input: {
  sourceUrl: string;
  width: number;
  format: OptimizedImageFormat;
  quality?: number;
}): Promise<{ buffer: Buffer; contentType: string; cacheKey: string }> {
  const source = resolveMediaSource(input.sourceUrl);
  if (!source) {
    throw new Error("Unsupported media source URL");
  }

  const quality = input.quality ?? DEFAULT_QUALITY;
  const original = await readMediaBytes(source);

  let pipeline = sharp(original, { failOn: "none" }).rotate();
  pipeline = pipeline.resize({
    width: input.width,
    withoutEnlargement: true,
    fit: "inside",
  });

  let contentType: string;
  switch (input.format) {
    case "webp":
      pipeline = pipeline.webp({ quality, effort: 4 });
      contentType = "image/webp";
      break;
    case "avif":
      pipeline = pipeline.avif({ quality, effort: 4 });
      contentType = "image/avif";
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      contentType = "image/jpeg";
      break;
  }

  const buffer = await pipeline.toBuffer();
  const cacheKey = `${source.kind}:${source.kind === "local" ? source.storedFilename : source.storagePath}:${input.width}:${input.format}:${quality}`;

  return { buffer, contentType, cacheKey };
}
