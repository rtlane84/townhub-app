import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "w-[180px]",
  md: "w-[240px]",
  lg: "w-[280px]",
  xl: "w-[320px]",
} as const;

/** Matches marketing screenshot proportions (~1284×2778). */
const FRAME_ASPECT = 9 / 19.5;

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
        "rounded-[2.5rem] md:rounded-[3rem]",
        "motion-safe:transition-transform",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: FRAME_ASPECT }}
    >
      {/* Proportional notch: scales with frame width so every size matches. */}
      <div
        className="absolute top-0 left-1/2 z-20 flex items-center justify-center bg-primary"
        style={{
          width: "34%",
          aspectRatio: "3.4 / 1",
          transform: "translateX(-50%)",
          borderBottomLeftRadius: "45%",
          borderBottomRightRadius: "45%",
        }}
        aria-hidden
      >
        <div
          className="rounded-full bg-gray-800"
          style={{ width: "42%", height: "14%" }}
        />
      </div>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className="w-full h-full object-cover object-top z-10 relative bg-white"
      />
      <div
        className="absolute inset-0 pointer-events-none rounded-[2.1rem] md:rounded-[2.6rem] shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] z-30"
        aria-hidden
      />
      <div
        className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-30"
        aria-hidden
      />
    </div>
  );
}
