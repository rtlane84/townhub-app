import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { HOMEPAGE_HERO_IMAGE_WIDTHS } from "@/lib/optimized-image";

type ResponsiveHeroImageProps = {
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
};

const HERO_SIZES = "100vw";
const HERO_QUALITY = 85;

export function ResponsiveHeroImage({
  src,
  className,
  onLoad,
  onError,
  priority = false,
}: ResponsiveHeroImageProps) {
  return (
    <OptimizedMediaImage
      src={src}
      widths={HOMEPAGE_HERO_IMAGE_WIDTHS}
      sizes={HERO_SIZES}
      quality={HERO_QUALITY}
      priority={priority}
      alt=""
      className={className}
      aria-hidden
      onLoad={onLoad}
      onError={onError}
    />
  );
}
