import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
  className?: string;
  /** Serif display title (default) vs compact sans */
  size?: "default" | "lg" | "sm";
};

export function SectionHeader({
  title,
  description,
  eyebrow,
  actionHref,
  actionLabel = "See all",
  icon,
  className,
  size = "default",
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2
            className={cn(
              "font-serif font-bold tracking-tight text-foreground",
              size === "lg" && "text-3xl md:text-4xl",
              size === "default" && "text-2xl md:text-3xl",
              size === "sm" && "text-xl md:text-2xl",
            )}
          >
            {title}
          </h2>
        </div>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actionHref ? (
        <Link
          href={actionHref}
          className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 sm:inline-flex"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
