import type { CSSProperties, ReactNode } from "react";
import { HeroImageLayers } from "@/components/hero-image-layers";
import {
  HERO_SECTION_MIN_HEIGHT_CLASS,
  type HeroImageFit,
  type HeroImagePosition,
} from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

type HeroPreviewFrameProps = {
  heroImageUrl: string;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  overlayStyle: CSSProperties;
  showHeroText: boolean;
  showHeroButtons: boolean;
  heroText?: ReactNode;
  heroButtons?: ReactNode;
};

/** Admin preview frame — matches live homepage hero dimensions and image treatment */
export function HeroPreviewFrame({
  heroImageUrl,
  heroImageFit,
  heroImagePosition,
  overlayStyle,
  showHeroText,
  showHeroButtons,
  heroText,
  heroButtons,
}: HeroPreviewFrameProps) {
  const showContent = (showHeroText && heroText) || (showHeroButtons && heroButtons);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-primary/20 flex items-center",
        HERO_SECTION_MIN_HEIGHT_CLASS,
      )}
    >
      <HeroImageLayers
        src={heroImageUrl}
        fit={heroImageFit}
        position={heroImagePosition}
        overlayStyle={overlayStyle}
      />

      {showContent ? (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 p-6">
          {showHeroText && heroText}
          {showHeroButtons && heroButtons}
        </div>
      ) : null}
    </div>
  );
}
