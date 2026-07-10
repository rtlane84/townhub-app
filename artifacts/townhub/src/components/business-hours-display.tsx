import { Badge } from "@/components/ui/badge";
import {
  formatBusinessHoursLines,
  hasOpenHours,
  isOpenNow,
  normalizeWeeklyHours,
  parseStructuredHours,
} from "@workspace/api-zod";
import type { BusinessDayHours } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type BusinessHoursDisplayProps = {
  structuredHours?: BusinessDayHours[] | null;
  fallbackHours?: string | null;
  showOpenNow?: boolean;
  className?: string;
  compact?: boolean;
};

export function BusinessHoursDisplay({
  structuredHours,
  fallbackHours,
  showOpenNow = false,
  className,
  compact = false,
}: BusinessHoursDisplayProps) {
  const parsed = Array.isArray(structuredHours)
    ? normalizeWeeklyHours(structuredHours)
    : parseStructuredHours(structuredHours);
  const lines = parsed?.length ? formatBusinessHoursLines(parsed) : null;
  const openNow =
    showOpenNow && parsed && hasOpenHours(parsed) ? isOpenNow(parsed) : null;

  if (!lines && !fallbackHours?.trim()) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {showOpenNow && openNow !== null && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium",
            openNow
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {openNow ? "Open now" : "Closed now"}
        </Badge>
      )}

      {lines ? (
        <ul className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
          {lines.map((line) => (
            <li key={line} className="text-foreground/80">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("text-foreground/80 whitespace-pre-line", compact ? "text-xs" : "text-sm")}>
          {fallbackHours}
        </p>
      )}
    </div>
  );
}
