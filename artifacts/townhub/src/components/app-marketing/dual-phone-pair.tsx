import { PhoneFrame, PHONE_FRAME_DUAL_CLASS } from "@/components/app-marketing/phone-frame";
import { cn } from "@/lib/utils";

type DualPhonePairProps = {
  front: { src: string; alt: string };
  back: { src: string; alt: string };
  /** Extra classes on each phone in the desktop side-by-side row. */
  desktopShadowClassName?: string;
  className?: string;
};

/**
 * Mobile: overlapping peek so both screens stay readable.
 * Desktop (lg+): side-by-side dual row.
 */
export function DualPhonePair({
  front,
  back,
  desktopShadowClassName = "shadow-2xl",
  className,
}: DualPhonePairProps) {
  return (
    <div className={cn("relative z-10 w-full min-w-0", className)}>
      {/* Mobile / tablet: overlap peek */}
      <div className="relative mx-auto flex h-[440px] w-full max-w-[360px] justify-center sm:h-[500px] lg:hidden">
        <div className="absolute left-[38%] top-[6%] z-0 rotate-6 opacity-95">
          <PhoneFrame
            src={back.src}
            alt={back.alt}
            size="lg"
            className="w-[min(200px,52vw)] sm:w-[220px]"
          />
        </div>
        <div className="absolute left-0 top-0 z-10 -rotate-2">
          <PhoneFrame
            src={front.src}
            alt={front.alt}
            size="xl"
            className={cn(
              "w-[min(260px,68vw)] sm:w-[min(280px,70vw)] max-w-[300px]",
              desktopShadowClassName,
            )}
          />
        </div>
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden w-full justify-center items-end gap-4 px-2 lg:flex">
        <PhoneFrame
          src={front.src}
          alt={front.alt}
          size="lg"
          className={cn(PHONE_FRAME_DUAL_CLASS, desktopShadowClassName)}
        />
        <PhoneFrame
          src={back.src}
          alt={back.alt}
          size="lg"
          className={cn(PHONE_FRAME_DUAL_CLASS, desktopShadowClassName)}
        />
      </div>
    </div>
  );
}
