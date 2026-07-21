import type { ReactNode } from "react";
import { HeroImageLayers } from "@/components/hero-image-layers";
import {
  HERO_SECTION_MIN_HEIGHT_CLASS,
  heroButtonPlacementJustifyClass,
  heroHorizontalJustifyClass,
  heroOverlaySizeClasses,
  type HeroButtonPlacement,
  type HeroImageFit,
  type HeroImagePosition,
  type HeroOverlayAlign,
  type HeroOverlaySize,
} from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

type HeroStageProps = {
  heroImageUrl?: string | null;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  responsive?: boolean;
  imageLoaded?: boolean;
  onImageLoad?: () => void;
  onImageError?: () => void;
  overlayImageUrl?: string | null;
  overlaySize: HeroOverlaySize;
  overlayAlign: HeroOverlayAlign;
  overlayAlt?: string;
  buttonPlacement: HeroButtonPlacement;
  buttons?: ReactNode;
  className?: string;
};

/** Shared hero composition used by both the live homepage and the admin preview. */
export function HeroStage({
  heroImageUrl,
  heroImageFit,
  heroImagePosition,
  responsive = false,
  imageLoaded = true,
  onImageLoad,
  onImageError,
  overlayImageUrl,
  overlaySize,
  overlayAlign,
  overlayAlt = "",
  buttonPlacement,
  buttons,
  className,
}: HeroStageProps) {
  const hasOverlay = !!overlayImageUrl;
  const hasButtons = !!buttons;

  return (
    <div className={cn("relative overflow-hidden", HERO_SECTION_MIN_HEIGHT_CLASS, className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-background" aria-hidden />
      {heroImageUrl ? (
        <HeroImageLayers
          src={heroImageUrl}
          fit={heroImageFit}
          position={heroImagePosition}
          responsive={responsive}
          imageLoaded={imageLoaded}
          onLoad={onImageLoad}
          onError={onImageError}
        />
      ) : null}
      {hasOverlay ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex items-center px-4 py-3 md:px-8 md:py-5",
            heroHorizontalJustifyClass(overlayAlign),
          )}
        >
          <img
            src={overlayImageUrl ?? undefined}
            alt={overlayAlt}
            width={640}
            height={640}
            className={cn("h-auto w-auto object-contain drop-shadow-xl", heroOverlaySizeClasses(overlaySize))}
          />
        </div>
      ) : null}
      {hasButtons ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-wrap gap-2.5 p-3 md:gap-3 md:p-5",
            heroButtonPlacementJustifyClass(buttonPlacement),
          )}
        >
          {buttons}
        </div>
      ) : null}
    </div>
  );
}
