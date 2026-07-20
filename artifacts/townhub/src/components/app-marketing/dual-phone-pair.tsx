import { PhoneFrame, PHONE_FRAME_DUAL_CLASS, PHONE_FRAME_SINGLE_CLASS } from "@/components/app-marketing/phone-frame";
import { cn } from "@/lib/utils";

type DualPhonePairProps = {
  front: { src: string; alt: string };
  back: { src: string; alt: string };
  /** Extra classes on phones (shadows). */
  desktopShadowClassName?: string;
  className?: string;
};

/**
 * Mobile: one centered phone (readable, no overflow).
 * Desktop (lg+): side-by-side dual row.
 */
export function DualPhonePair({
  front,
  back,
  desktopShadowClassName = "shadow-2xl",
  className,
}: DualPhonePairProps) {
  return (
    <div className={cn("relative z-10 w-full min-w-0 overflow-hidden", className)}>
      {/* Mobile / tablet: single phone only */}
      <div className="flex justify-center px-4 lg:hidden">
        <PhoneFrame
          src={front.src}
          alt={front.alt}
          size="xl"
          className={cn(PHONE_FRAME_SINGLE_CLASS, desktopShadowClassName)}
        />
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
