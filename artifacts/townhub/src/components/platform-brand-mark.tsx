import { cn } from "@/lib/utils";
import { splitPlatformBrandName } from "@/lib/platform-brand-name";

export type BrandWordColors = {
  prefix?: string | null;
  town?: string | null;
  hub?: string | null;
};

type PlatformBrandMarkProps = {
  name: string;
  className?: string;
  /** Compact native title-bar treatment */
  compact?: boolean;
  /** Optional overrides (settings preview). Live site uses CSS vars from theme. */
  colors?: BrandWordColors;
};

/**
 * Wordmark: prefix (Clay) + Town + Hub, each with its own color.
 * Defaults: muted / primary / heading. Overrides via theme CSS vars or `colors` prop.
 */
export function PlatformBrandMark({
  name,
  className,
  compact = false,
  colors,
}: PlatformBrandMarkProps) {
  const { prefix, town, hub } = splitPlatformBrandName(name);

  if (!town || !hub) {
    return (
      <span
        className={cn(
          "font-semibold tracking-tight text-platform-heading",
          compact ? "font-sans text-[15px] tracking-[-0.01em]" : "font-serif",
          className,
        )}
        style={colors?.hub ? { color: colors.hub } : undefined}
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
        <span
          className="font-medium text-muted-foreground"
          style={{ color: colors?.prefix || "var(--brand-prefix, hsl(var(--muted-foreground)))" }}
        >
          {prefix}
        </span>
      ) : null}
      <span
        className="text-primary"
        style={{ color: colors?.town || "var(--brand-town, hsl(var(--primary)))" }}
      >
        {town}
      </span>
      <span
        className="text-platform-heading"
        style={{
          color: colors?.hub || "var(--brand-hub, var(--platform-heading, hsl(var(--foreground))))",
        }}
      >
        {hub}
      </span>
    </span>
  );
}
