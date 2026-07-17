import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PeekCarouselProps = {
  children: ReactNode[];
  /** Extra classes for each slide (overrides default peek widths when set). */
  itemClassName?: string;
  className?: string;
  label?: string;
};

/**
 * Horizontal showcase rail powered by Embla: peek of the next card, swipe,
 * page dots, and always-visible prev/next — avoids nested overflow-x scroll
 * fighting the page vertical scroller on native WebViews.
 */
export function PeekCarousel({
  children,
  itemClassName,
  className,
  label,
}: PeekCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;

    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };

    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (children.length === 0) return null;

  // Keep single items at the same peek width as multi-item rails (start-aligned).
  // Skip Embla chrome / nav when there is only one slide.
  if (children.length === 1) {
    return (
      <div className={cn("w-full", className)} aria-label={label}>
        <div className="-ml-3 flex items-stretch">
          <div
            className={cn(
              "flex min-w-0 shrink-0 grow-0 basis-[82%] pl-3 sm:basis-[48%] lg:basis-[32%]",
              itemClassName,
            )}
          >
            {children[0]}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Carousel
      setApi={setApi}
      opts={{
        align: "start",
        containScroll: "trimSnaps",
        dragFree: false,
        skipSnaps: false,
      }}
      className={cn("w-full", className)}
      aria-label={label}
    >
      <CarouselContent className="-ml-3 items-stretch">
        {children.map((child, index) => (
          <CarouselItem
            key={index}
            className={cn(
              "flex basis-[82%] pl-3 sm:basis-[48%] lg:basis-[32%]",
              itemClassName,
            )}
          >
            {child}
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div
          className="flex min-h-11 items-center"
          role="group"
          aria-label={label ? `${label} slides` : "Slides"}
        >
          {Array.from({ length: snapCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => api?.scrollTo(index)}
            >
              <span
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === selected
                    ? "w-5 bg-primary"
                    : "w-2 bg-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            disabled={!canPrev}
            onClick={() => api?.scrollPrev()}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            disabled={!canNext}
            onClick={() => api?.scrollNext()}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </Carousel>
  );
}
