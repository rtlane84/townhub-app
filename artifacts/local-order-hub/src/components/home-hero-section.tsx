import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
import { usePlatformBranding } from "@/components/theme-provider";
import {
  buildOptimizedSrcSet,
  buildResponsiveHeroPreloadHref,
  HOMEPAGE_HERO_IMAGE_WIDTHS,
  isOptimizableMediaUrl,
} from "@/lib/optimized-image";
import { cn } from "@/lib/utils";

const HERO_MIN_HEIGHT_CLASS = "min-h-[420px]";
const HERO_IMAGE_QUALITY = 85;

export function HomeHeroSection() {
  const {
    heroTagline,
    heroHeadline,
    heroHeadlineAccentColor,
    shopCtaLabel,
    heroImageUrl,
    heroOverlayStyle,
    heroPrimaryButtonStyle,
    themeLoading,
  } = usePlatformBranding();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showHeroImage = !!heroImageUrl && !imageFailed;
  const imagePending = showHeroImage && !imageLoaded;
  const heroOptimizable = !!heroImageUrl && isOptimizableMediaUrl(heroImageUrl);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [heroImageUrl]);

  useEffect(() => {
    if (!heroImageUrl) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.fetchPriority = "high";

    if (heroOptimizable) {
      link.href = buildResponsiveHeroPreloadHref(heroImageUrl, "webp", HERO_IMAGE_QUALITY);
      link.setAttribute(
        "imagesrcset",
        buildOptimizedSrcSet(heroImageUrl, HOMEPAGE_HERO_IMAGE_WIDTHS, "webp", HERO_IMAGE_QUALITY),
      );
      link.setAttribute("imagesizes", "100vw");
    } else {
      link.href = heroImageUrl;
    }

    document.head.appendChild(link);
    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [heroImageUrl, heroOptimizable]);

  return (
    <section
      className={cn(
        "relative overflow-hidden py-24 flex items-center",
        HERO_MIN_HEIGHT_CLASS,
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
        <>
          <ResponsiveHeroImage
            src={heroImageUrl}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              imageLoaded ? "opacity-100" : "opacity-70",
            )}
            style={heroOverlayStyle ?? undefined}
            aria-hidden
          />
        </>
      ) : null}

      {imagePending ? (
        <div className="absolute inset-0 animate-pulse bg-primary/10" aria-hidden />
      ) : null}

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
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/businesses">
                <Button
                  variant={showHeroImage && imageLoaded ? "outline" : "default"}
                  size="lg"
                  style={showHeroImage && imageLoaded ? heroPrimaryButtonStyle ?? undefined : undefined}
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
          </>
        )}
      </div>
    </section>
  );
}
