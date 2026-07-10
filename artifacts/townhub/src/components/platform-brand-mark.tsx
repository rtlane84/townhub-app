import { cn } from "@/lib/utils";
import { splitPlatformBrandName } from "@/lib/platform-brand-name";

type PlatformBrandMarkProps = {
  name: string;
  className?: string;
  /** Compact native title-bar treatment */
  compact?: boolean;
};

/**
 * Modern title-bar wordmark: Town in primary navy, Hub in heading/foreground.
 * Compact mode uses tighter sans tracking for the native nav.
 */
export function PlatformBrandMark({ name, className, compact = false }: PlatformBrandMarkProps) {
  const { prefix, town, hub } = splitPlatformBrandName(name);

  if (!town || !hub) {
    return (
      <span
        className={cn(
          "font-semibold tracking-tight text-platform-heading",
          compact ? "font-sans text-[15px] tracking-[-0.01em]" : "font-serif",
          className,
        )}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-semibold tracking-tight",
        compact ? "font-sans text-[15px] tracking-[-0.015em]" : "font-serif",
        className,
      )}
      aria-label={name}
    >
      {prefix ? (
        <span className="text-muted-foreground font-medium">{prefix}</span>
      ) : null}
      <span className="text-primary">{town}</span>
      <span className="text-platform-heading">{hub}</span>
    </span>
  );
}
