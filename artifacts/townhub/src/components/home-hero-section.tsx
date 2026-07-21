import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HomeSearchBar } from "@/components/home-search-bar";
import { TownPhotoCarousel } from "@/components/town-photo-carousel";
import { usePlatformBranding } from "@/components/theme-provider";
import { useNativePlatform } from "@/hooks/use-native-platform";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { resolveTownPhotoSlides } from "@/lib/town-photos";
import { cn } from "@/lib/utils";

/**
 * Homepage hero — town-photo carousel with optional overlay/CTAs from platform settings.
 * Falls back to the legacy single hero image when no town photos are configured.
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
    showHeroOverlay,
    showShopButton,
    showListBusinessButton,
    platformName,
    townPhotos,
    themeLoading,
  } = usePlatformBranding();

  const slides = resolveTownPhotoSlides(townPhotos, heroImageUrl);
  const showButtons =
    !themeLoading && (showShopButton || showListBusinessButton);
  const overlayUrl = showHeroOverlay ? heroOverlayImageUrl : null;

  if (themeLoading && slides.length === 0) {
    return (
      <section
        className={cn(
          PAGE_CONTAINER,
          isNative ? "pt-3 pb-1" : "pt-4 pb-2 md:pt-6 md:pb-3",
        )}
      >
        <div
          className="aspect-[16/9] animate-pulse rounded-[1.35rem] bg-muted/60"
          aria-hidden
        />
      </section>
    );
  }

  if (slides.length === 0 && !showButtons) {
    return null;
  }

  return (
    <section
      aria-label={`${platformName} homepage hero`}
      className={cn(
        PAGE_CONTAINER,
        isNative ? "pt-3 pb-1" : "pt-4 pb-2 md:pt-6 md:pb-3",
      )}
    >
      {slides.length > 0 ? (
        <TownPhotoCarousel
          slides={slides}
          platformName={platformName}
          heroImageFit={heroImageFit}
          heroImagePosition={heroImagePosition}
          overlayImageUrl={overlayUrl}
          overlaySize={heroOverlaySize}
          overlayAlign={heroOverlayAlign}
          footer={
            <HomeSearchBar variant="hero" className="mx-auto w-full" />
          }
        />
      ) : (
        <div className="relative aspect-[16/9] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          <div className="absolute inset-x-3 bottom-3 z-[3] sm:inset-x-4 sm:bottom-4">
            <HomeSearchBar variant="hero" className="mx-auto w-full" />
          </div>
        </div>
      )}

      {showButtons ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
          {showShopButton ? (
            <Link href="/businesses">
              <Button
                size="sm"
                className="h-9 rounded-full border-0 bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_4px_16px_-4px_rgba(30,58,138,0.45)] md:h-10 md:px-5 md:text-sm"
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
                className="h-9 rounded-full border-border/70 bg-card px-4 text-xs font-semibold text-foreground shadow-sm md:h-10 md:px-5 md:text-sm"
              >
                List Your Business
              </Button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
