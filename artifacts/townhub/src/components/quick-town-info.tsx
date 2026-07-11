import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** Shared grid shell for homepage “Today” glance cards — same canvas as the rest of home. */
export function QuickTownInfo({ children }: { children: ReactNode }) {
  return (
    <section className="py-4 th-fade-up md:py-6">
      <div className={PAGE_CONTAINER}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          At a glance
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">{children}</div>
      </div>
    </section>
  );
}

type QuickTownInfoCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Equal-height white card on the shared background. */
export function QuickTownInfoCard({ title, icon, children, className }: QuickTownInfoCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.35rem] transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <CardContent className="flex flex-1 flex-col p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-base leading-none"
            aria-hidden
          >
            {icon}
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </CardContent>
    </Card>
  );
}
