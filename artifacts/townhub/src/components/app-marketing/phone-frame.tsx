import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "w-[180px]",
  md: "w-[240px]",
  lg: "w-[280px]",
  xl: "w-[320px]",
} as const;

/** Width / height for aspect-ratio (phone chrome proportions). */
const SIZE_RATIO = {
  sm: 180 / 389,
  md: 240 / 519,
  lg: 280 / 605,
  xl: 320 / 692,
} as const;

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
  const ratio = SIZE_RATIO[size];

  return (
    <div
      className={cn(
        "relative border-[6px] border-primary bg-primary shadow-2xl overflow-hidden shrink-0 flex",
        "rounded-[2.5rem] md:rounded-[3rem]",
        "motion-safe:transition-transform",
        "aspect-[9/19.5]",
        SIZE_CLASS[size],
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 md:h-6 bg-primary rounded-b-3xl z-20 flex justify-center items-center"
        aria-hidden
      >
        <div className="w-10 md:w-12 h-1 md:h-1.5 bg-gray-800 rounded-full" />
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
