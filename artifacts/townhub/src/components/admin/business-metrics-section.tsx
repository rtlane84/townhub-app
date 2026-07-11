import type { PlatformMetrics } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

type MetricTileProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
};

function MetricTile({ label, value, hint, tone = "default" }: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-1",
        tone === "warning" && "border-amber-200 bg-amber-50/50",
        tone === "danger" && "border-red-200 bg-red-50/50",
        tone === "default" && "border-border bg-muted/20",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BusinessMetricsSection({
  metrics,
  isLoading,
}: {
  metrics?: PlatformMetrics | null;
  isLoading: boolean;
}) {
  return (
    <Card data-testid="business-metrics-section" id="business-metrics-section">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Business Metrics
        </CardTitle>
        <CardDescription>Platform statistics for daily operations and growth tracking.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : !metrics ? (
          <p className="text-sm text-muted-foreground">
            Business metrics unavailable — other dashboard sections continue to load normally.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricTile
              label="Active Businesses"
              value={metrics.activeBusinesses.toLocaleString()}
              hint="Currently live on the platform"
            />
            <MetricTile
              label="Active Subscriptions"
              value={metrics.activeSubscriptions.toLocaleString()}
              hint="ACTIVE and BETA plans"
            />
            <MetricTile
              label="Trial Businesses"
              value={metrics.trialSubscriptions.toLocaleString()}
              hint="TRIAL and TRIALING status"
            />
            <MetricTile
              label="Pending Applications"
              value={metrics.pendingApplications.toLocaleString()}
              tone={metrics.pendingApplications > 0 ? "warning" : "default"}
              hint="Awaiting admin review"
            />
            <MetricTile
              label="Past Due Subscriptions"
              value={metrics.pastDueSubscriptions.toLocaleString()}
              tone={metrics.pastDueSubscriptions > 0 ? "danger" : "default"}
              hint="Requires billing attention"
            />
            <MetricTile
              label="Orders Today"
              value={metrics.ordersToday.toLocaleString()}
              hint="Since midnight (server time)"
            />
            <MetricTile
              label="Orders This Month"
              value={metrics.ordersThisMonth.toLocaleString()}
              hint="Current calendar month"
            />
            <MetricTile
              label="Revenue Today"
              value={formatCurrency(metrics.revenueToday)}
              hint={metrics.revenueToday == null ? "Wire up when payment reconciliation is ready" : "Non-canceled orders"}
            />
            <MetricTile
              label="Revenue This Month"
              value={formatCurrency(metrics.revenueThisMonth)}
              hint={metrics.revenueThisMonth == null ? "Wire up when payment reconciliation is ready" : "Non-canceled orders"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
