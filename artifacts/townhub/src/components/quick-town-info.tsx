import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** Shared grid shell for homepage town dashboard cards. */
export function QuickTownInfo({ children }: { children: ReactNode }) {
  return (
    <section className="py-6 th-fade-up md:py-8">
      <div className={PAGE_CONTAINER}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">{children}</div>
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

/** Equal-height card shell — Wallet-style dashboard tiles. */
export function QuickTownInfoCard({ title, icon, children, className }: QuickTownInfoCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.5rem] transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <CardContent className="flex flex-1 flex-col p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-base leading-none"
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
