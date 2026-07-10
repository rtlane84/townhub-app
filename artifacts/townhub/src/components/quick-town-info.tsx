import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shared grid shell for homepage town dashboard cards. Add children to extend. */
export function QuickTownInfo({ children }: { children: ReactNode }) {
  return (
    <section className="border-b border-border/40 bg-muted/15 py-10 native-animate-in">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">{children}</div>
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

/** Equal-height card shell matching Wallet-style homepage cards. */
export function QuickTownInfoCard({ title, icon, children, className }: QuickTownInfoCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col border-0 bg-card/90 shadow-[0_2px_20px_-6px_rgba(15,23,42,0.1)]",
        className,
      )}
    >
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-base leading-none"
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
