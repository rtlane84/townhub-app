import { cn } from "@/lib/utils";
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
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-5">
          {QUEUE_SUMMARY_STATUSES.map((status) => {
            const active = activeStatus === status;
            const count = counts[status];

            return (
              <button
                key={status}
                type="button"
                onClick={() => onSelectStatus(status)}
                className={cn(
                  "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors min-w-[7.5rem] sm:min-w-0",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-muted/40",
                )}
                data-testid={`queue-count-${status.toLowerCase()}`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {QUEUE_SUMMARY_LABELS[status]}
                </span>
                <span
                  className={cn(
                    "text-2xl font-bold leading-none mt-1",
                    count > 0 ? "text-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {reflectsFilters ? (
        <p className="text-[11px] text-muted-foreground px-1">
          Queue counts reflect your current date and search filters.
        </p>
      ) : null}
    </div>
  );
}
