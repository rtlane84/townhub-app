import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "w-[180px]",
  md: "w-[240px]",
  lg: "w-[280px]",
  xl: "w-[320px]",
} as const;

/** Matches marketing screenshot proportions (~1284×2778). */
const FRAME_ASPECT = 9 / 19.5;

/** Shared dual-phone row sizing (shop + business sections). */
export const PHONE_FRAME_DUAL_CLASS =
  "w-[47%] max-w-[210px] sm:max-w-[250px] md:max-w-[280px] lg:max-w-[300px]";

/** Shared single-phone sizing (hero, residents, showcase, CTA). */
export const PHONE_FRAME_SINGLE_CLASS = "w-[min(300px,78vw)] max-w-[320px]";

type PhoneFrameProps = {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  /** Eager for above-the-fold hero shots; lazy for the rest. */
  loading?: "eager" | "lazy";
};

export function PhoneFrame({
  src,
  alt,
  size = "md",
  className,
  loading = "lazy",
}: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "relative bg-primary shadow-2xl shrink-0 box-border",
        // Radius as % of frame size so small phones do not clip the bottom nav.
        "rounded-[12%]",
        "p-[2.4%]",
        "motion-safe:transition-transform",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: FRAME_ASPECT }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[10%] bg-white">
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top bg-white"
        />

        {/* Top-bezel notch — matches the good marketing reference. */}
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 bg-primary flex items-center justify-center"
          style={{
            top: 0,
            width: "34%",
            aspectRatio: "2.85 / 1",
            borderBottomLeftRadius: "42%",
            borderBottomRightRadius: "42%",
          }}
          aria-hidden
        >
          <div
            className="rounded-full bg-gray-800/90"
            style={{ width: "40%", height: "16%" }}
          />
        </div>

        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_0_12px_rgba(0,0,0,0.08)] z-30"
          aria-hidden
        />
      </div>
    </div>
  );
}
