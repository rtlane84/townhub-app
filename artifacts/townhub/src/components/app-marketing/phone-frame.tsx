import { cn } from "@/lib/utils";

/** Replit-style fixed widths; height comes from aspect-ratio so className width overrides stay correct. */
const SIZE_CLASS = {
  sm: "w-[180px]",
  md: "w-[240px]",
  lg: "w-[280px]",
  xl: "w-[320px]",
} as const;

/** Matches marketing screenshots (~1284×2778) and Replit lg 280×605. */
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
        "relative border-[6px] border-primary bg-primary shadow-2xl overflow-hidden shrink-0 flex",
        // Width-relative radius matches the good large-phone silhouette on small phones.
        "rounded-[min(2.5rem,11%)]",
        "motion-safe:transition-transform",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: FRAME_ASPECT }}
    >
      {/* Replit-style attached notch, sized as % of frame so every size matches. */}
      <div
        className="absolute top-0 left-1/2 z-20 flex -translate-x-1/2 items-center justify-center bg-primary rounded-b-3xl"
        style={{ width: "33.333%", aspectRatio: "4 / 1" }}
        aria-hidden
      >
        <div
          className="rounded-full bg-gray-800"
          style={{ width: "55%", height: "22%" }}
        />
      </div>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className="relative z-10 h-full w-full bg-white object-cover object-top"
      />
      <div
        className="pointer-events-none absolute inset-0 z-30 rounded-[min(2.1rem,10%)] shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-gradient-to-b from-white/10 to-transparent"
        aria-hidden
      />
    </div>
  );
}
