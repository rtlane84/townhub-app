import type { ReactNode } from "react";
import { HeroStage } from "@/components/hero-stage";
import type {
  HeroButtonPlacement,
  HeroImageFit,
  HeroImagePosition,
  HeroOverlayAlign,
  HeroOverlaySize,
} from "@/lib/platform-branding";

type HeroPreviewFrameProps = {
  heroImageUrl: string | null;
  heroOverlayImageUrl: string | null;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  heroOverlaySize: HeroOverlaySize;
  heroOverlayAlign: HeroOverlayAlign;
  heroButtonPlacement: HeroButtonPlacement;
  buttons?: ReactNode;
};

/** Admin preview — uses the exact same HeroStage as the live homepage. */
export function HeroPreviewFrame({
  heroImageUrl,
  heroOverlayImageUrl,
  heroImageFit,
  heroImagePosition,
  heroOverlaySize,
  heroOverlayAlign,
  heroButtonPlacement,
  buttons,
}: HeroPreviewFrameProps) {
  return (
    <HeroStage
      heroImageUrl={heroImageUrl}
      heroImageFit={heroImageFit}
      heroImagePosition={heroImagePosition}
      overlayImageUrl={heroOverlayImageUrl}
      overlaySize={heroOverlaySize}
      overlayAlign={heroOverlayAlign}
      buttonPlacement={heroButtonPlacement}
      buttons={buttons}
      className="aspect-[16/9] min-h-0 rounded-2xl"
    />
  );
}
