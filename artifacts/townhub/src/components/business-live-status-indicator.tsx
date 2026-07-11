import { cn } from "@/lib/utils";
import type { BusinessLiveConnectionStatus } from "@/hooks/business-live-events-provider";
import { resolveLiveIndicatorStatus } from "@/lib/business-live-indicator-status";

export { resolveLiveIndicatorStatus };

const STATUS_LABEL: Record<BusinessLiveConnectionStatus, string> = {
  live: "Live",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  fallback: "Polling",
  disconnected: "Offline",
};

const STATUS_DOT: Record<BusinessLiveConnectionStatus, string> = {
  live: "bg-emerald-500",
  connecting: "bg-amber-400 animate-pulse",
  reconnecting: "bg-amber-400 animate-pulse",
  fallback: "bg-sky-500",
  disconnected: "bg-muted-foreground/50",
};

type Props = {
  status: BusinessLiveConnectionStatus;
  className?: string;
};

export function BusinessLiveStatusIndicator({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground",
        className,
      )}
      data-testid="business-live-status"
      data-live-status={status}
      title={`Dashboard updates: ${STATUS_LABEL[status]}`}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
