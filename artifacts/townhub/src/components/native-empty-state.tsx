import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NativeEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Vertically center within a taller page region (e.g. events). */
  centered?: boolean;
};

/**
 * Premium empty state — soft card, large SF-style icon, optional CTA.
 * Prefer this over dashed web placeholders.
 */
export function NativeEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  centered = false,
}: NativeEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "rounded-[1.25rem] border-0 bg-card/80 px-6 py-12 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)]",
        "backdrop-blur-sm supports-[backdrop-filter]:bg-card/70",
        centered && "min-h-[min(52vh,28rem)]",
        className,
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
