import { useMemo } from "react";
import {
  buildOptimizedMediaUrl,
  buildOptimizedSrcSet,
  HOMEPAGE_HERO_IMAGE_WIDTHS,
  isOptimizableMediaUrl,
} from "@/lib/optimized-image";

type ResponsiveHeroImageProps = {
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
};

const HERO_SIZES = "100vw";
const HERO_QUALITY = 85;

export function ResponsiveHeroImage({
  src,
  className,
  onLoad,
  onError,
}: ResponsiveHeroImageProps) {
  const optimizable = useMemo(() => isOptimizableMediaUrl(src), [src]);

  const handleLoad = () => {
    onLoad?.();
  };

  if (!optimizable) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        aria-hidden
        decoding="async"
        fetchPriority="high"
        onLoad={handleLoad}
        onError={onError}
      />
    );
  }

  const avifSrcSet = buildOptimizedSrcSet(src, HOMEPAGE_HERO_IMAGE_WIDTHS, "avif", HERO_QUALITY);
  const webpSrcSet = buildOptimizedSrcSet(src, HOMEPAGE_HERO_IMAGE_WIDTHS, "webp", HERO_QUALITY);
  const fallbackSrc = buildOptimizedMediaUrl(src, { width: 1536, format: "webp", quality: HERO_QUALITY });

  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcSet} sizes={HERO_SIZES} />
      <source type="image/webp" srcSet={webpSrcSet} sizes={HERO_SIZES} />
      <img
        src={fallbackSrc}
        srcSet={webpSrcSet}
        sizes={HERO_SIZES}
        alt=""
        className={className}
        aria-hidden
        decoding="async"
        fetchPriority="high"
        onLoad={handleLoad}
        onError={onError}
      />
    </picture>
  );
}
