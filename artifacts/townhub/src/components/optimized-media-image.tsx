import { useMemo, type ImgHTMLAttributes } from "react";
import {
  buildOptimizedMediaUrl,
  buildOptimizedSrcSet,
  isOptimizableMediaUrl,
} from "@/lib/optimized-image";

type OptimizedMediaImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "sizes" | "loading" | "fetchPriority"
> & {
  src: string;
  widths: readonly number[];
  sizes: string;
  priority?: boolean;
  eager?: boolean;
  quality?: number;
};

/**
 * Responsive delivery for TownHub-managed media. Unsupported external media is
 * intentionally left direct so the API optimizer's source allowlist stays narrow.
 */
export function OptimizedMediaImage({
  src,
  widths,
  sizes,
  priority = false,
  eager = false,
  quality = 80,
  ...imageProps
}: OptimizedMediaImageProps) {
  const optimizable = useMemo(() => isOptimizableMediaUrl(src), [src]);
  const largestWidth = widths[widths.length - 1];

  if (!optimizable || largestWidth == null) {
    return (
      <img
        {...imageProps}
        src={src}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : eager ? "auto" : "low"}
        decoding="async"
      />
    );
  }

  const srcSet = buildOptimizedSrcSet(src, widths, "webp", quality);

  return (
    <img
      {...imageProps}
      src={buildOptimizedMediaUrl(src, {
        width: largestWidth,
        format: "webp",
        quality,
      })}
      srcSet={srcSet}
      sizes={sizes}
      loading={priority || eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : eager ? "auto" : "low"}
      decoding="async"
    />
  );
}
