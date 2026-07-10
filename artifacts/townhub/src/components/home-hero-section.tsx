import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroStage } from "@/components/hero-stage";
import { usePlatformBranding } from "@/components/theme-provider";
import { useNativePlatform } from "@/hooks/use-native-platform";

/**
 * Marketing hero for web only. Native home skips this so users land in
 * the dashboard content immediately (Apple Weather / Maps style).
 */
export function HomeHeroSection() {
  const { isNative } = useNativePlatform();
  const {
    shopCtaLabel,
    heroImageUrl,
    heroOverlayImageUrl,
    heroImageFit,
    heroImagePosition,
    heroOverlaySize,
    heroOverlayAlign,
    showShopButton,
    showListBusinessButton,
    heroButtonPlacement,
    platformName,
    themeLoading,
  } = usePlatformBranding();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showHeroImage = !!heroImageUrl && !imageFailed;

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [heroImageUrl]);

  if (isNative) return null;

  const showButtons = !themeLoading && (showShopButton || showListBusinessButton);

  return (
    <section aria-label={`${platformName} homepage hero`} className="overflow-hidden">
      <HeroStage
        heroImageUrl={showHeroImage ? heroImageUrl : null}
        heroImageFit={heroImageFit}
        heroImagePosition={heroImagePosition}
        responsive
        imageLoaded={imageLoaded}
        onImageLoad={() => setImageLoaded(true)}
        onImageError={() => setImageFailed(true)}
        overlayImageUrl={heroOverlayImageUrl}
        overlaySize={heroOverlaySize}
        overlayAlign={heroOverlayAlign}
        overlayAlt={`${platformName} hero`}
        buttonPlacement={heroButtonPlacement}
        className="rounded-none md:rounded-none"
        buttons={
          showButtons ? (
            <>
              {showShopButton ? (
                <Link href="/businesses">
                  <Button
                    size="lg"
                    className="h-11 rounded-2xl border-0 bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_4px_20px_-4px_rgba(30,58,138,0.45)] md:h-[52px] md:px-8 md:text-base"
                  >
                    {shopCtaLabel}
                  </Button>
                </Link>
              ) : null}
              {showListBusinessButton ? (
                <Link href="/list-your-business">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-2xl border-0 bg-card/95 px-6 text-sm font-semibold text-foreground shadow-md backdrop-blur-xl hover:bg-card md:h-[52px] md:px-8 md:text-base"
                  >
                    List Your Business
                  </Button>
                </Link>
              ) : null}
            </>
          ) : null
        }
      />
    </section>
  );
}
