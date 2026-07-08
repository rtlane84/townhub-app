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
  /** Background image (Layer 1). Null renders the fallback gradient only. */
  heroImageUrl?: string | null;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  /** Use the optimized responsive picture element on the live homepage. */
  responsive?: boolean;
  imageLoaded?: boolean;
  onImageLoad?: () => void;
  onImageError?: () => void;

  /** Transparent logo/text overlay (Layer 2). Never cropped — only scales down. */
  overlayImageUrl?: string | null;
  overlaySize: HeroOverlaySize;
  overlayAlign: HeroOverlayAlign;
  overlayAlt?: string;

  /** CTA buttons (Layer 3). */
  buttonPlacement: HeroButtonPlacement;
  buttons?: ReactNode;

  className?: string;
};

/**
 * Shared hero composition used by both the live homepage and the admin preview,
 * so the two always match. Three stacked layers:
 *   1. Background image (crops)      2. Overlay image (never crops)     3. CTA buttons
 */
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
    <div
      className={cn(
        "relative flex overflow-hidden",
        HERO_SECTION_MIN_HEIGHT_CLASS,
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-background"
        aria-hidden
      />

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

      {hasOverlay || hasButtons ? (
        <div className="relative z-10 flex w-full flex-col justify-end gap-4 p-6 md:p-10">
          {hasOverlay ? (
            <div
              className={cn(
                "flex flex-1 items-center",
                heroHorizontalJustifyClass(overlayAlign),
              )}
            >
              <img
                src={overlayImageUrl ?? undefined}
                alt={overlayAlt}
                className={cn(
                  "h-auto w-auto object-contain drop-shadow-xl",
                  heroOverlaySizeClasses(overlaySize),
                )}
              />
            </div>
          ) : null}

          {hasButtons ? (
            <div
              className={cn(
                "flex flex-wrap gap-3",
                heroButtonPlacementJustifyClass(buttonPlacement),
              )}
            >
              {buttons}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
