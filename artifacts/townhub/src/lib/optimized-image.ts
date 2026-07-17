import { resolveApiUrl } from "./api-base-url.ts";

export const HOMEPAGE_HERO_IMAGE_WIDTHS = [640, 1024, 1536, 1920] as const;
export const CARD_IMAGE_WIDTHS = [320, 480, 640, 960] as const;
export const THUMBNAIL_IMAGE_WIDTHS = [96, 144, 192, 256] as const;
export const LOGO_IMAGE_WIDTHS = [40, 80, 128, 192, 256] as const;

export type OptimizedImageFormat = "webp" | "avif" | "jpeg";

export function isOptimizableMediaUrl(sourceUrl: string): boolean {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/api/media/files/")) return true;

  try {
    const url = new URL(trimmed);
    return url.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

export function buildOptimizedMediaUrl(
  sourceUrl: string,
  options: { width: number; format: OptimizedImageFormat; quality?: number },
): string {
  const params = new URLSearchParams({
    src: sourceUrl,
    w: String(options.width),
    fm: options.format,
  });
  if (options.quality != null) {
    params.set("q", String(options.quality));
  }
  return resolveApiUrl(`/api/media/optimize?${params.toString()}`);
}

export function buildOptimizedSrcSet(
  sourceUrl: string,
  widths: readonly number[],
  format: OptimizedImageFormat,
  quality = 85,
): string {
  return widths
    .map((width) => `${buildOptimizedMediaUrl(sourceUrl, { width, format, quality })} ${width}w`)
    .join(", ");
}

export function buildResponsiveHeroPreloadHref(
  sourceUrl: string,
  format: OptimizedImageFormat = "webp",
  quality = 85,
): string {
  return buildOptimizedMediaUrl(sourceUrl, {
    width: HOMEPAGE_HERO_IMAGE_WIDTHS[HOMEPAGE_HERO_IMAGE_WIDTHS.length - 1],
    format,
    quality,
  });
}
