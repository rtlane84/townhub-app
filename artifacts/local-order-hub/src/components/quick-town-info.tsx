import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Shared grid shell for homepage town dashboard cards. Add children to extend. */
export function QuickTownInfo({ children }: { children: ReactNode }) {
  return (
    <section className="border-b border-border/50 bg-muted/20 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
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

/** Equal-height card shell matching existing homepage card styling. */
export function QuickTownInfoCard({ title, icon, children, className }: QuickTownInfoCardProps) {
  return (
    <Card className={cn("flex h-full flex-col border-border/50 shadow-sm", className)}>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base leading-none" aria-hidden>
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </CardContent>
    </Card>
  );
}
