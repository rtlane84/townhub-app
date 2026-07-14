import { useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

type CategoryOption = {
  label: string;
  value: string;
};

type Props = {
  categories: CategoryOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  className?: string;
};

/**
 * Embla free-scroll chips row — more reliable than overflow-x + buttons on iOS WKWebView,
 * where page vertical scroll often steals the gesture.
 */
export function CategoryChipScroller({
  categories,
  selectedValue,
  onSelect,
  className,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    axis: "x",
    containScroll: "trimSnaps",
    dragFree: true,
    skipSnaps: true,
    watchDrag: true,
  });
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!emblaApi) return;
    const el = chipRefs.current.get(selectedValue);
    if (!el) return;
    const slides = emblaApi.slideNodes();
    const index = slides.findIndex((slide) => slide.contains(el));
    if (index >= 0) {
      emblaApi.scrollTo(index, true);
    }
  }, [emblaApi, selectedValue]);

  return (
    <div
      className={cn("min-w-0 overflow-hidden", className)}
      role="listbox"
      aria-label="Business categories"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const index = categories.findIndex((cat) => cat.value === selectedValue);
        if (index < 0) return;
        const nextIndex =
          event.key === "ArrowRight"
            ? Math.min(categories.length - 1, index + 1)
            : Math.max(0, index - 1);
        onSelect(categories[nextIndex]!.value);
      }}
    >
      <div
        className="overflow-hidden touch-pan-x"
        style={{ touchAction: "pan-x" }}
        ref={emblaRef}
      >
        <div className="flex gap-1.5 px-0.5 pb-1">
          {categories.map((cat) => {
            const active = selectedValue === cat.value;
            return (
              <div key={cat.value} className="min-w-0 shrink-0">
                <button
                  ref={(node) => {
                    if (node) chipRefs.current.set(cat.value, node);
                    else chipRefs.current.delete(cat.value);
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onSelect(cat.value)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                    active
                      ? "bg-[var(--platform-heading,#1e3a5f)] text-white"
                      : "border border-black/[0.08] bg-card text-foreground/80 hover:bg-muted/60",
                  )}
                >
                  {cat.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
