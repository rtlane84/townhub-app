import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroStage } from "@/components/hero-stage";
import { usePlatformBranding } from "@/components/theme-provider";
import { useNativePlatform } from "@/hooks/use-native-platform";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Compact homepage hero — same composition on desktop web, mobile web, and iOS.
 * Admin image / overlay / alignment / CTA settings still apply; only spacing
 * and crop respond slightly on narrow viewports.
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

  const showButtons = !themeLoading && (showShopButton || showListBusinessButton);

  return (
    <section
      aria-label={`${platformName} homepage hero`}
      className={cn(PAGE_CONTAINER, isNative ? "pt-3 pb-1" : "pt-4 pb-2 md:pt-6 md:pb-3")}
    >
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
        className="max-h-[180px] rounded-[1.5rem] shadow-[0_8px_28px_-10px_rgba(15,23,42,0.16)] md:max-h-[200px]"
        buttons={
          showButtons ? (
            <>
              {showShopButton ? (
                <Link href="/businesses">
                  <Button
                    size="sm"
                    className={cn(
                      "h-9 rounded-full border-0 bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_4px_16px_-4px_rgba(30,58,138,0.45)]",
                      "md:h-10 md:px-5 md:text-sm",
                    )}
                  >
                    {shopCtaLabel}
                  </Button>
                </Link>
              ) : null}
              {showListBusinessButton ? (
                <Link href="/list-your-business">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-9 rounded-full border-0 bg-card/95 px-4 text-xs font-semibold text-foreground shadow-md backdrop-blur-xl hover:bg-card",
                      "md:h-10 md:px-5 md:text-sm",
                    )}
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
