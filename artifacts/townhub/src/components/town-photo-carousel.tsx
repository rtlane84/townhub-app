import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ResponsiveHeroImage } from "@/components/responsive-hero-image";
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

const AUTO_ADVANCE_MS = 5000;

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
 * Homepage town-photo carousel with swipe, page dots, and ~5s auto-advance.
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const pauseUntilRef = useRef(0);
  const multi = slides.length > 1;

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

  const pauseAutoAdvance = useCallback(() => {
    pauseUntilRef.current = Date.now() + AUTO_ADVANCE_MS;
  }, []);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !multi || prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [api, multi, prefersReducedMotion]);

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
      onPointerDown={pauseAutoAdvance}
      onTouchStart={pauseAutoAdvance}
      onKeyDown={pauseAutoAdvance}
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
                      "pointer-events-none absolute inset-0 z-[1] flex items-center px-4 pb-14 pt-5 md:px-6 md:pb-16",
                      heroHorizontalJustifyClass(overlayAlign),
                    )}
                  >
                    <img
                      src={overlayImageUrl}
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

      {footer || showControls ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center gap-2 px-3 pb-2.5 sm:px-4 sm:pb-3",
          )}
        >
          {showControls ? (
            <div
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 shadow-sm backdrop-blur-[2px] ring-1 ring-white/25"
              role="tablist"
              aria-label={`Image ${selectedIndex + 1} of ${visibleSlides.length}`}
            >
              {visibleSlides.map((slide, index) => {
                const selected = index === selectedIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`Image ${index + 1} of ${visibleSlides.length}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      prefersReducedMotion ? "duration-0" : "duration-300",
                      selected
                        ? "w-5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                        : "w-1.5 bg-white/55 hover:bg-white/85",
                    )}
                    onClick={() => {
                      pauseAutoAdvance();
                      api?.scrollTo(index);
                    }}
                  />
                );
              })}
            </div>
          ) : null}
          {footer ? <div className="w-full">{footer}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
