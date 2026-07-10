import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
import {
  heroImageObjectClasses,
  type HeroImageFit,
  type HeroImagePosition,
} from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

type HeroImageLayersProps = {
  src: string;
  fit: HeroImageFit;
  position: HeroImagePosition;
  imageLoaded?: boolean;
  /** Use optimized responsive picture element (live homepage). Default false for admin preview. */
  responsive?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

const IMAGE_BASE_CLASS = "absolute inset-0 h-full w-full transition-opacity duration-500";

/** Layer 1 — the hero background image. Crops normally (object-cover) unless "Show full image". */
export function HeroImageLayers({
  src,
  fit,
  position,
  imageLoaded = true,
  responsive = false,
  onLoad,
  onError,
}: HeroImageLayersProps) {
  const objectClasses = heroImageObjectClasses(fit, position);
  const imageOpacityClass = imageLoaded ? "opacity-100" : "opacity-0";
  const imageClassName = cn(IMAGE_BASE_CLASS, objectClasses, imageOpacityClass);

  return (
    <>
      {fit === "contain" ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-muted/40"
          aria-hidden
        />
      ) : null}

      {responsive ? (
        <ResponsiveHeroImage
          src={src}
          className={imageClassName}
          onLoad={onLoad}
          onError={onError}
        />
      ) : (
        <img
          src={src}
          alt=""
          className={imageClassName}
          aria-hidden
          onLoad={onLoad}
          onError={onError}
        />
      )}
    </>
  );
}
