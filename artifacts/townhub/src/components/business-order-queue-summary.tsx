import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_QUEUE_ACCENT_CLASS,
  ORDER_STATUS_QUEUE_ACTIVE_CLASS,
} from "@/lib/order-status-colors";
import {
  QUEUE_SUMMARY_LABELS,
  QUEUE_SUMMARY_STATUSES,
  type QueueSummaryStatus,
} from "@/lib/business-order-display";

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
                  ? cn("border-2 border-l-4 scale-[1.02]", ORDER_STATUS_QUEUE_ACTIVE_CLASS[status])
                  : cn("border-l-4 hover:bg-muted/50", ORDER_STATUS_QUEUE_ACCENT_CLASS[status]),
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
