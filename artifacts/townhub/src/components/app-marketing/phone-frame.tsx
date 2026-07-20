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

/**
 * Classic iPhone-style top notch (attached to bezel), not a floating Dynamic Island.
 * viewBox tuned to the approved marketing reference: wide U-cutout + speaker + camera.
 */
function PhoneNotch() {
  return (
    <svg
      className="absolute left-1/2 top-0 z-20 -translate-x-1/2 text-primary pointer-events-none"
      style={{ width: "40%" }}
      viewBox="0 0 210 32"
      fill="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 0h210v2.5c0 2.2-1.2 5.5-4.2 10.2C201.5 19.5 190 32 168 32H42C20 32 8.5 19.5 4.2 12.7 1.2 8 0 4.7 0 2.5V0Z"
      />
      {/* Speaker */}
      <rect x="68" y="11" width="52" height="5" rx="2.5" fill="#111827" />
      {/* Camera */}
      <circle cx="138" cy="13.5" r="4.2" fill="#0a0a0a" />
      <circle cx="138" cy="13.5" r="1.6" fill="#1e293b" />
    </svg>
  );
}

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
        // Softer %-radius so screen content (status bar / nav) is not clipped.
        "rounded-[11%]",
        "p-[2%]",
        "motion-safe:transition-transform",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: FRAME_ASPECT }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[9.5%] bg-white">
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top bg-white"
        />
        <PhoneNotch />
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_0_12px_rgba(0,0,0,0.08)] z-30"
          aria-hidden
        />
      </div>
    </div>
  );
}
