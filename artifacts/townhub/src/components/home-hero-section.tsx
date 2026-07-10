import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroStage } from "@/components/hero-stage";
import { usePlatformBranding } from "@/components/theme-provider";
import { useNativePlatform } from "@/hooks/use-native-platform";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Compact brand hero — kept on native as an inset card (not a tall landing banner)
 * so users still see branding/CTAs without delaying the dashboard content.
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
      className={cn(isNative ? cn(PAGE_CONTAINER, "pt-3 pb-1") : "overflow-hidden")}
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
        overlaySize={isNative ? "small" : heroOverlaySize}
        overlayAlign={heroOverlayAlign}
        overlayAlt={`${platformName} hero`}
        buttonPlacement={heroButtonPlacement}
        className={cn(
          isNative
            ? "min-h-[132px] max-h-[160px] md:min-h-[132px] md:max-h-[160px] rounded-[1.5rem] shadow-[0_8px_28px_-10px_rgba(15,23,42,0.18)]"
            : "rounded-none md:rounded-none",
        )}
        buttons={
          showButtons ? (
            <>
              {showShopButton ? (
                <Link href="/businesses">
                  <Button
                    size={isNative ? "sm" : "lg"}
                    className={cn(
                      "border-0 bg-primary font-semibold text-primary-foreground shadow-[0_4px_16px_-4px_rgba(30,58,138,0.45)]",
                      isNative
                        ? "h-9 rounded-full px-4 text-xs"
                        : "h-11 rounded-2xl px-6 text-sm md:h-[52px] md:px-8 md:text-base",
                    )}
                  >
                    {shopCtaLabel}
                  </Button>
                </Link>
              ) : null}
              {showListBusinessButton ? (
                <Link href="/list-your-business">
                  <Button
                    size={isNative ? "sm" : "lg"}
                    variant="outline"
                    className={cn(
                      "border-0 bg-card/95 font-semibold text-foreground shadow-md backdrop-blur-xl hover:bg-card",
                      isNative
                        ? "h-9 rounded-full px-4 text-xs"
                        : "h-11 rounded-2xl px-6 text-sm md:h-[52px] md:px-8 md:text-base",
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
