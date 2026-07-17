import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { getSupabaseClientForMedia } from "./media-fetch";
import { localMediaFilePath, resolveMediaSource, type ResolvedMediaSource } from "./media-source";

export type OptimizedImageFormat = "webp" | "avif" | "jpeg";

const MAX_OUTPUT_WIDTH = 2560;
const DEFAULT_QUALITY = 85;
const OPTIMIZED_CACHE_MAX_ENTRIES = 256;
const OPTIMIZED_CACHE_MAX_BYTES = 32 * 1024 * 1024;

type OptimizedImageResult = {
  buffer: Buffer;
  contentType: string;
  cacheKey: string;
};

export class ByteLruCache<T> {
  private readonly entries = new Map<string, { value: T; bytes: number }>();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxBytes: number,
    private readonly sizeOf: (value: T) => number,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const bytes = this.sizeOf(value);
    const previous = this.entries.get(key);
    if (previous) {
      this.totalBytes -= previous.bytes;
      this.entries.delete(key);
    }

    if (bytes > this.maxBytes || this.maxEntries < 1) return;

    this.entries.set(key, { value, bytes });
    this.totalBytes += bytes;

    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (oldestKey == null) break;
      const oldest = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      this.totalBytes -= oldest?.bytes ?? 0;
    }
  }

  clear(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }
}

const optimizedImageCache = new ByteLruCache<OptimizedImageResult>(
  OPTIMIZED_CACHE_MAX_ENTRIES,
  OPTIMIZED_CACHE_MAX_BYTES,
  (value) => value.buffer.byteLength,
);
const pendingOptimizations = new Map<string, Promise<OptimizedImageResult>>();

export function resetOptimizedImageCacheForTests(): void {
  optimizedImageCache.clear();
  pendingOptimizations.clear();
}

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
}): Promise<OptimizedImageResult> {
  const source = resolveMediaSource(input.sourceUrl);
  if (!source) {
    throw new Error("Unsupported media source URL");
  }

  const quality = input.quality ?? DEFAULT_QUALITY;
  const cacheKey = `${source.kind}:${source.kind === "local" ? source.storedFilename : source.storagePath}:${input.width}:${input.format}:${quality}`;
  const cached = optimizedImageCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingOptimizations.get(cacheKey);
  if (pending) return pending;

  const optimization = (async (): Promise<OptimizedImageResult> => {
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
        pipeline = pipeline.webp({ quality, effort: 3 });
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

    const result = { buffer: await pipeline.toBuffer(), contentType, cacheKey };
    optimizedImageCache.set(cacheKey, result);
    return result;
  })();

  pendingOptimizations.set(cacheKey, optimization);
  try {
    return await optimization;
  } finally {
    pendingOptimizations.delete(cacheKey);
  }
}
