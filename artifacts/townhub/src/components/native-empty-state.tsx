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
 * Premium empty state — soft card, large icon, optional CTA.
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
        "rounded-[1.75rem] border-0 bg-card px-6 py-14 shadow-[0_2px_24px_-6px_rgba(15,23,42,0.1)]",
        centered && "min-h-[min(52vh,28rem)]",
        className,
      )}
    >
      <div className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
        <Icon className="h-9 w-9" strokeWidth={1.6} aria-hidden />
      </div>
      <h2 className="font-serif text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
