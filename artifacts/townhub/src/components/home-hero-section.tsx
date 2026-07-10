import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroStage } from "@/components/hero-stage";
import { usePlatformBranding } from "@/components/theme-provider";

export function HomeHeroSection() {
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

  const showButtons = !themeLoading && (showShopButton || showListBusinessButton);

  return (
    <section aria-label={`${platformName} homepage hero`}>
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
        buttons={
          showButtons ? (
            <>
              {showShopButton ? (
                <Link href="/businesses">
                  <Button
                    size="lg"
                    className="h-[50px] rounded-2xl border-0 bg-accent px-8 text-base font-bold text-slate-900 shadow-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 hover:bg-accent/90 hover:text-slate-900"
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
                    className="h-[50px] rounded-2xl border bg-white/90 px-8 text-base font-semibold text-foreground shadow-md backdrop-blur-xl hover:bg-white"
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
