import { cn } from "@/lib/utils";
import {
  QUEUE_SUMMARY_LABELS,
  QUEUE_SUMMARY_STATUSES,
  type QueueSummaryStatus,
} from "@/lib/business-order-display";

const QUEUE_SUMMARY_ACCENT: Record<QueueSummaryStatus, string> = {
  NEW: "border-l-blue-500 bg-blue-50/40",
  CONFIRMED: "border-l-indigo-500 bg-indigo-50/40",
  PREPARING: "border-l-amber-500 bg-amber-50/40",
  READY_FOR_PICKUP: "border-l-green-500 bg-green-50/40",
  OUT_FOR_DELIVERY: "border-l-purple-500 bg-purple-50/40",
};

const QUEUE_SUMMARY_ACTIVE: Record<QueueSummaryStatus, string> = {
  NEW: "border-blue-500 bg-blue-100 ring-2 ring-blue-500/50 shadow-md",
  CONFIRMED: "border-indigo-500 bg-indigo-100 ring-2 ring-indigo-500/50 shadow-md",
  PREPARING: "border-amber-500 bg-amber-100 ring-2 ring-amber-500/50 shadow-md",
  READY_FOR_PICKUP: "border-green-600 bg-green-100 ring-2 ring-green-600/50 shadow-md",
  OUT_FOR_DELIVERY: "border-purple-500 bg-purple-100 ring-2 ring-purple-500/50 shadow-md",
};

interface BusinessOrderQueueSummaryProps {
  counts: Record<QueueSummaryStatus, number>;
  activeStatus: string;
  onSelectStatus: (status: QueueSummaryStatus) => void;
  reflectsFilters?: boolean;
}

export function BusinessOrderQueueSummary({
  counts,
  activeStatus,
  onSelectStatus,
  reflectsFilters = false,
}: BusinessOrderQueueSummaryProps) {
  return (
    <div className="space-y-1.5" data-testid="order-queue-summary">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {QUEUE_SUMMARY_STATUSES.map((status) => {
          const active = activeStatus === status;
          const count = counts[status];

          return (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(status)}
              aria-pressed={active}
              className={cn(
                "relative flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-all duration-150 sm:px-3 sm:py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                active
                  ? cn("border-2 border-l-4 scale-[1.02]", QUEUE_SUMMARY_ACTIVE[status])
                  : cn("border-l-4 hover:bg-muted/50", QUEUE_SUMMARY_ACCENT[status]),
              )}
              data-testid={`queue-count-${status.toLowerCase()}`}
              data-active={active ? "true" : "false"}
            >
              {active ? (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary shadow-sm" aria-hidden />
              ) : null}
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide leading-tight",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {QUEUE_SUMMARY_LABELS[status]}
              </span>
              <span
                className={cn(
                  "text-xl sm:text-2xl font-bold leading-none mt-1",
                  count > 0 ? "text-foreground" : "text-muted-foreground/70",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {reflectsFilters ? (
        <p className="text-[11px] text-muted-foreground px-1">
          Queue counts reflect your current date and search filters.
        </p>
      ) : null}
    </div>
  );
}
