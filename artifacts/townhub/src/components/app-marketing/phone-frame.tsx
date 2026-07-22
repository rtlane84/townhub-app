import { cn } from "@/lib/utils";

/** Fixed screenshot widths; height comes from aspect-ratio so className width overrides stay correct. */
const SIZE_CLASS = {
  sm: "w-[180px]",
  md: "w-[240px]",
  lg: "w-[280px]",
  xl: "w-[320px]",
} as const;

/** Matches the portrait marketing screenshots (~1284×2778). */
const FRAME_ASPECT = 9 / 19.5;

/** Shared dual-screenshot row sizing (shop + business sections). */
export const PHONE_FRAME_DUAL_CLASS =
  "w-[47%] max-w-[210px] sm:max-w-[250px] md:max-w-[280px] lg:max-w-[300px]";

/** Shared single-screenshot sizing (hero, residents, showcase, CTA). */
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
        "relative shrink-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl",
        "motion-safe:transition-transform",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: FRAME_ASPECT }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className="relative z-10 h-full w-full bg-white object-cover object-top"
      />
      <div className="pointer-events-none absolute inset-0 z-30 rounded-[2rem] shadow-[inset_0_0_15px_rgba(0,0,0,0.06)]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-white/10 to-transparent"
        aria-hidden
      />
    </div>
  );
}
