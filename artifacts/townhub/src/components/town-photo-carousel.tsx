import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { Button } from "@/components/ui/button";
import { CARD_IMAGE_WIDTHS } from "@/lib/optimized-image";
import {
  heroImageObjectClasses,
  heroHorizontalJustifyClass,
  heroOverlaySizeClasses,
  type HeroImageFit,
  type HeroImagePosition,
  type HeroOverlayAlign,
  type HeroOverlaySize,
} from "@/lib/platform-branding";
import type { TownPhotoSlide } from "@/lib/town-photos";
import { cn } from "@/lib/utils";

type TownPhotoCarouselProps = {
  slides: TownPhotoSlide[];
  platformName: string;
  heroImageFit?: HeroImageFit;
  heroImagePosition?: HeroImagePosition;
  overlayImageUrl?: string | null;
  overlaySize?: HeroOverlaySize;
  overlayAlign?: HeroOverlayAlign;
  /** Overlay content pinned near the bottom of the hero (e.g. search) */
  footer?: ReactNode;
  className?: string;
};

/**
 * Homepage town-photo carousel with manual swipe and keyboard controls.
 * Single-slide collections hide controls; empty collections render nothing.
 */
export function TownPhotoCarousel({
  slides,
  platformName,
  heroImageFit = "cover",
  heroImagePosition = "center",
  overlayImageUrl,
  overlaySize = "medium",
  overlayAlign = "center",
  footer,
  className,
}: TownPhotoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const markFailed = useCallback((id: string) => {
    setFailedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (slides.length === 0) return null;

  const visibleSlides = slides.filter((slide) => !failedIds.has(slide.id));
  if (visibleSlides.length === 0) {
    return (
      <div
        className={cn(
          "relative aspect-[16/9] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-primary/15 via-primary/5 to-background",
          className,
        )}
        aria-label={`${platformName} homepage hero`}
      />
    );
  }

  const showControls = visibleSlides.length > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${platformName} town photos`}
      className={cn("relative", className)}
    >
      <Carousel
        setApi={setApi}
        opts={{
          loop: showControls,
          align: "start",
          duration: prefersReducedMotion ? 0 : 25,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {visibleSlides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-0 basis-full">
              <figure
                className="relative aspect-[16/9] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-primary/15 via-primary/5 to-background shadow-[0_6px_24px_-10px_rgba(15,23,42,0.14)]"
                aria-roledescription="slide"
                aria-label={
                  slide.caption
                    ? `${slide.caption} (${index + 1} of ${visibleSlides.length})`
                    : `Town photo ${index + 1} of ${visibleSlides.length}`
                }
              >
                <ResponsiveHeroImage
                  src={slide.url}
                  priority={index === 0}
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    heroImageObjectClasses(heroImageFit, heroImagePosition),
                  )}
                  onError={() => markFailed(slide.id)}
                />
                <span className="sr-only">
                  {slide.caption || `${platformName} town photo`}
                </span>

                {overlayImageUrl ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 z-[1] flex items-center px-4 pb-12 pt-5 md:px-6 md:pb-14",
                      heroHorizontalJustifyClass(overlayAlign),
                    )}
                  >
                    <OptimizedMediaImage
                      src={overlayImageUrl}
                      widths={CARD_IMAGE_WIDTHS}
                      sizes="(min-width: 768px) 40vw, 70vw"
                      alt=""
                      aria-hidden
                      className={cn(
                        "max-h-full w-auto object-contain drop-shadow-md",
                        heroOverlaySizeClasses(overlaySize),
                      )}
                    />
                  </div>
                ) : null}

                {slide.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/55 to-transparent px-4 pb-14 pt-8 text-sm font-medium text-white">
                    {slide.caption}
                  </figcaption>
                ) : null}
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {showControls ? (
        <div className="absolute right-2 top-2 z-[4] flex items-center gap-1.5" aria-label="Town photo controls">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 w-11 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
            onClick={() => api?.scrollPrev()}
            aria-label="Previous town photo"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 w-11 rounded-full bg-background/90 shadow-sm backdrop-blur-sm"
            onClick={() => api?.scrollNext()}
            aria-label="Next town photo"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      ) : null}

      {showControls ? (
        <div
          className="absolute left-2 top-2 z-[4] flex items-center"
          role="group"
          aria-label="Choose a town photo"
        >
          {visibleSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Show town photo ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
            >
              <span
                className={cn(
                  "h-2.5 rounded-full shadow-sm transition-all",
                  index === selected ? "w-6 bg-white" : "w-2.5 bg-white/65",
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
      ) : null}

      {footer ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center px-3 pb-2.5 sm:px-4 sm:pb-3">
          <div className="w-full">{footer}</div>
        </div>
      ) : null}
    </section>
  );
}
