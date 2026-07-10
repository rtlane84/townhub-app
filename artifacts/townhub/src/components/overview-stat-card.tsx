import type { ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type OverviewStatCardProps = {
  href: string;
  locked?: boolean;
  onLockedClick?: () => void;
  testId: string;
  icon: ReactNode;
  value: ReactNode;
  label: string;
};

export function OverviewStatCard({
  href,
  locked = false,
  onLockedClick,
  testId,
  icon,
  value,
  label,
}: OverviewStatCardProps) {
  const card = (
    <Card
      className={cn(
        "h-full transition-all",
        locked
          ? "opacity-90"
          : "hover:border-primary/35 hover:bg-muted/25 hover:shadow-md cursor-pointer group",
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-2">{icon}</div>
        <p className="text-3xl font-serif font-bold">{value}</p>
        <p
          className={cn(
            "text-sm text-muted-foreground mt-1",
            !locked && "group-hover:text-foreground transition-colors",
          )}
        >
          {label}
        </p>
      </CardContent>
    </Card>
  );

  if (locked) {
    return (
      <button
        type="button"
        className="text-left w-full rounded-xl"
        onClick={onLockedClick}
        data-testid={testId}
      >
        {card}
      </button>
    );
  }

  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={testId}>
      {card}
    </Link>
  );
}
