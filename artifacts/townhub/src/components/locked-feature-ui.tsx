import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LockedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 text-xs font-normal text-muted-foreground", className)}
    >
      <Lock className="h-3 w-3" />
      Locked
    </Badge>
  );
}

export function lockedSurfaceClass(locked: boolean): string {
  return locked ? "opacity-60 saturate-[0.85] pointer-events-none select-none" : "";
}
