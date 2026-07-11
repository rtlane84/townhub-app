import type { PlatformHealthSummary } from "@workspace/api-client-react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileWarning,
  Mail,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type OverallStatus = "healthy" | "warning" | "error";

export type AttentionCardAction =
  | { type: "scroll"; targetId: string; notificationFilter?: "FAILED" }
  | { type: "navigate"; href: string };

type AttentionCardProps = {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "warning" | "danger";
  action: AttentionCardAction;
  onAction: (action: AttentionCardAction) => void;
  testId?: string;
  className?: string;
};

function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function statusStyles(status: OverallStatus): { card: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case "healthy":
      return { card: "border-green-200 bg-green-50/80 text-green-900", icon: CheckCircle2 };
    case "warning":
      return { card: "border-amber-200 bg-amber-50/80 text-amber-900", icon: AlertTriangle };
    case "error":
      return { card: "border-red-200 bg-red-50/80 text-red-900", icon: XCircle };
  }
}

function statusLabel(status: OverallStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
  }
}

function toneClass(tone: AttentionCardProps["tone"]): string {
  switch (tone) {
    case "success":
      return "border-green-200 bg-green-50/60 hover:bg-green-50";
    case "warning":
      return "border-amber-200 bg-amber-50/60 hover:bg-amber-50";
    case "danger":
      return "border-red-200 bg-red-50/60 hover:bg-red-50";
    default:
      return "border-border bg-card hover:bg-muted/40";
  }
}

function AttentionCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  action,
  onAction,
  testId,
  className,
}: AttentionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onAction(action)}
      className={cn(
        "rounded-lg border h-[92px] w-full px-3 py-2",
        "flex flex-col items-center justify-center gap-1 text-center",
        "transition-colors hover:ring-2 hover:ring-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneClass(tone),
        className,
      )}
      data-testid={testId}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-none whitespace-nowrap">
        {label}
      </span>
      <span className="text-xl font-semibold leading-none tabular-nums">{value}</span>
    </button>
  );
}

export function PlatformSummaryCards({
  summary,
  failedNotificationsToday,
  isLoading,
  onAction,
}: {
  summary?: PlatformHealthSummary;
  failedNotificationsToday?: number;
  isLoading: boolean;
  onAction: (action: AttentionCardAction) => void;
}) {
  const overallStatus = (summary?.overallStatus ?? "warning") as OverallStatus;
  const styles = statusStyles(overallStatus);
  const OverallIcon = styles.icon;
  const failedCount = failedNotificationsToday ?? summary?.failedEmailsToday ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="platform-summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="platform-summary">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => onAction({ type: "scroll", targetId: "platform-health-section" })}
          className={cn(
            "rounded-lg border h-[92px] w-full px-3 py-2",
            "flex flex-col items-center justify-center gap-1 text-center",
            "transition-colors hover:ring-2 hover:ring-primary/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "sm:col-span-2 lg:col-span-1",
            styles.card,
          )}
          data-testid="summary-overall-status"
        >
          <OverallIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-wide opacity-80 leading-none whitespace-nowrap">
            Platform Status
          </span>
          <span className="text-xl font-semibold leading-none">{statusLabel(overallStatus)}</span>
        </button>

        <AttentionCard
          label="Pending Apps"
          value={formatCount(summary?.pendingApplications)}
          icon={Activity}
          tone={(summary?.pendingApplications ?? 0) > 0 ? "warning" : "default"}
          action={{ type: "navigate", href: "/dashboard/admin/applications" }}
          onAction={onAction}
          testId="summary-pending-applications"
        />
        <AttentionCard
          label="Past Due"
          value={formatCount(summary?.pastDueSubscriptions)}
          icon={CreditCard}
          tone={(summary?.pastDueSubscriptions ?? 0) > 0 ? "danger" : "default"}
          action={{ type: "scroll", targetId: "business-metrics-section" }}
          onAction={onAction}
          testId="summary-past-due"
        />
        <AttentionCard
          label="API Errors"
          value={formatCount(summary?.apiErrorsLast24h ?? 0)}
          icon={FileWarning}
          tone={(summary?.apiErrorsLast24h ?? 0) > 0 ? "warning" : "default"}
          action={{ type: "scroll", targetId: "api-error-log-panel" }}
          onAction={onAction}
          testId="summary-api-errors"
        />
        <AttentionCard
          label="Failed Notices"
          value={formatCount(failedCount)}
          icon={Mail}
          tone={failedCount > 0 ? "danger" : "default"}
          action={{ type: "scroll", targetId: "notification-log-panel", notificationFilter: "FAILED" }}
          onAction={onAction}
          testId="summary-failed-notices"
        />
        <AttentionCard
          label="Orders Today"
          value={formatCount(summary?.ordersToday)}
          icon={ShoppingBag}
          action={{ type: "navigate", href: "/dashboard/admin/orders" }}
          onAction={onAction}
          testId="summary-orders-today"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Top cards show items that may need attention. Detailed platform metrics are shown below.
      </p>
    </div>
  );
}
