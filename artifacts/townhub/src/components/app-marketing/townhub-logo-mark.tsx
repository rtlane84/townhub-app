import { cn } from "@/lib/utils";
import townhubLogo from "@/assets/app-marketing/townhub-logo.png";

type TownhubLogoMarkProps = {
  className?: string;
  /** Pixel size for the circular logo image. */
  sizePx?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function TownhubLogoMark({
  className,
  sizePx = 36,
  showWordmark = true,
  wordmarkClassName,
}: TownhubLogoMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={townhubLogo}
        alt="TownHub"
        width={sizePx}
        height={sizePx}
        className="shrink-0 object-contain"
        style={{ width: sizePx, height: sizePx }}
        decoding="async"
      />
      {showWordmark ? (
        <span
          className={cn(
            "font-bold font-serif text-primary tracking-tight",
            wordmarkClassName,
          )}
        >
          TownHub
        </span>
      ) : null}
    </span>
  );
}
