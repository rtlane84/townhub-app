import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
import {
  heroImageObjectClasses,
  type HeroImageFit,
  type HeroImagePosition,
} from "@/lib/platform-branding";

type HeroImageLayersProps = {
  src: string;
  fit: HeroImageFit;
  position: HeroImagePosition;
  responsive?: boolean;
  imageLoaded?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

/** Layer 1 — the hero background image. Crops normally unless "Show full image" is selected. */
export function HeroImageLayers({
  src,
  fit,
  position,
  responsive = false,
  imageLoaded = true,
  onLoad,
  onError,
}: HeroImageLayersProps) {
  const className = `absolute inset-0 h-full w-full transition-opacity duration-300 ${heroImageObjectClasses(
    fit,
    position,
  )} ${imageLoaded ? "opacity-100" : "opacity-0"}`;

  return responsive ? (
    <ResponsiveHeroImage
      src={src}
      priority
      className={className}
      onLoad={onLoad}
      onError={onError}
    />
  ) : (
    <img
      src={src}
      alt=""
      aria-hidden
      className={className}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
