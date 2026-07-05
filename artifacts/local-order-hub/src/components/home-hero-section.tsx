import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroImageLayers } from "@/components/hero-image-layers";
import { usePlatformBranding } from "@/components/theme-provider";
import { HERO_SECTION_MIN_HEIGHT_CLASS } from "@/lib/platform-branding";
import { cn } from "@/lib/utils";

export function HomeHeroSection() {
  const {
    heroTagline,
    heroHeadline,
    heroHeadlineAccentColor,
    shopCtaLabel,
    heroImageUrl,
    heroImageFit,
    heroImagePosition,
    showHeroText,
    showHeroButtons,
    heroOverlayStyle,
    heroPrimaryButtonStyle,
    themeLoading,
  } = usePlatformBranding();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showHeroImage = !!heroImageUrl && !imageFailed;
  const imagePending = showHeroImage && !imageLoaded;

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [heroImageUrl]);

  return (
    <section
      className={cn(
        "relative overflow-hidden py-[3.825rem] md:py-24 flex items-center",
        HERO_SECTION_MIN_HEIGHT_CLASS,
        showHeroImage ? "bg-primary/20" : "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-background transition-opacity duration-500",
          showHeroImage && imageLoaded ? "opacity-0" : "opacity-100",
        )}
        aria-hidden
      />

      {showHeroImage ? (
        <HeroImageLayers
          src={heroImageUrl}
          fit={heroImageFit}
          position={heroImagePosition}
          overlayStyle={heroOverlayStyle}
          imageLoaded={imageLoaded}
          responsive
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      ) : null}

      {imagePending ? (
        <div className="absolute inset-0 animate-pulse bg-primary/10" aria-hidden />
      ) : null}

      {(showHeroText || showHeroButtons) && (
        <div
          className={cn(
            "container relative z-10 mx-auto max-w-3xl px-4 text-center",
            showHeroImage && imageLoaded && "text-white",
          )}
        >
          {themeLoading ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <Skeleton className="mx-auto h-12 w-4/5" />
              <Skeleton className="mx-auto h-12 w-3/5" />
              <Skeleton className="mx-auto h-6 w-full max-w-xl" />
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Skeleton className="h-14 w-48 rounded-full" />
                <Skeleton className="h-14 w-48 rounded-full" />
              </div>
            </div>
          ) : (
            <>
              {showHeroText ? (
                <>
                  <h1
                    className={cn(
                      "mb-6 font-serif text-5xl font-bold leading-tight md:text-6xl",
                      showHeroImage && imageLoaded ? "text-white" : "text-foreground",
                    )}
                  >
                    {heroHeadline.line1} <br />
                    <span
                      className={showHeroImage && imageLoaded ? "drop-shadow-sm" : undefined}
                      style={{ color: heroHeadlineAccentColor }}
                    >
                      {heroHeadline.line2}
                    </span>
                  </h1>
                  <p
                    className={cn(
                      "mx-auto mb-10 max-w-2xl text-xl leading-relaxed",
                      showHeroImage && imageLoaded
                        ? "font-medium text-white drop-shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {heroTagline}
                  </p>
                </>
              ) : null}
              {showHeroButtons ? (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-4 sm:flex-row",
                    !showHeroText && "pt-0",
                  )}
                >
                  <Link href="/businesses">
                    <Button
                      variant={showHeroImage && imageLoaded ? "outline" : "default"}
                      size="lg"
                      style={
                        showHeroImage && imageLoaded ? heroPrimaryButtonStyle ?? undefined : undefined
                      }
                      className={cn(
                        "h-14 w-full rounded-full px-8 text-lg font-semibold shadow-lg sm:w-auto",
                        showHeroImage && imageLoaded && "shadow-xl hover:opacity-90",
                      )}
                    >
                      {shopCtaLabel}
                    </Button>
                  </Link>
                  <Link href="/list-your-business">
                    <Button
                      variant="outline"
                      size="lg"
                      className={cn(
                        "h-14 w-full rounded-full px-8 text-lg font-medium sm:w-auto",
                        showHeroImage && imageLoaded
                          ? "border-2 border-white bg-white/10 text-white shadow-sm hover:border-white hover:bg-white/20"
                          : "bg-white text-foreground",
                      )}
                    >
                      List Your Business
                    </Button>
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}
