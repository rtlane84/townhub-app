import { useGetAdminSystemHealth, getGetAdminSystemHealthQueryKey } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertTriangle, CheckCircle2, HelpCircle, Server, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceStatus = "healthy" | "degraded" | "unhealthy" | "not_configured";

const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  unhealthy: "Unhealthy",
  not_configured: "Not configured",
};

function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return CheckCircle2;
    case "degraded":
    case "not_configured":
      return AlertTriangle;
    case "unhealthy":
      return XCircle;
    default:
      return HelpCircle;
  }
}

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "text-green-600 bg-green-50 border-green-200";
    case "degraded":
    case "not_configured":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "unhealthy":
      return "text-red-700 bg-red-50 border-red-200";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function OverallBadge({ status }: { status: "healthy" | "degraded" | "unhealthy" }) {
  const Icon = statusIcon(status === "healthy" ? "healthy" : status === "degraded" ? "degraded" : "unhealthy");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
        statusColor(status === "healthy" ? "healthy" : status === "degraded" ? "degraded" : "unhealthy"),
      )}
      data-testid="overall-status"
    >
      <Icon className="h-4 w-4" />
      {STATUS_LABEL[status === "healthy" ? "healthy" : status === "degraded" ? "degraded" : "unhealthy"]}
    </span>
  );
}

export default function AdminSystemStatus() {
  const { data: health, isLoading, isError, error } = useGetAdminSystemHealth({
    query: {
      queryKey: getGetAdminSystemHealthQueryKey(),
      retry: 1,
    },
  });

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">System Status</h1>
            <p className="text-muted-foreground mt-1">Operational health across TownHub services</p>
          </div>
          {health && <OverallBadge status={health.status} />}
        </div>

        {isError && (
          <Alert variant="destructive" data-testid="health-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load system health</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "The health endpoint is unavailable or you may not have admin access."}
            </AlertDescription>
          </Alert>
        )}

        {/* Application */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : health ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{health.application.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Environment</dt>
                  <dd className="font-medium">{health.application.environment}</dd>
                </div>
                {health.application.version && (
                  <div>
                    <dt className="text-muted-foreground">Version</dt>
                    <dd className="font-medium">{health.application.version}</dd>
                  </div>
                )}
                {health.application.buildDate && (
                  <div>
                    <dt className="text-muted-foreground">Build date</dt>
                    <dd className="font-medium">{health.application.buildDate}</dd>
                  </div>
                )}
                {health.application.commitSha && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Commit</dt>
                    <dd className="font-mono text-xs break-all">{health.application.commitSha}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Uptime</dt>
                  <dd className="font-medium">{formatUptime(health.application.uptimeSeconds)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Checked at</dt>
                  <dd className="font-medium">{new Date(health.application.timestamp).toLocaleString()}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : health ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {health.services.map((service) => {
                  const Icon = statusIcon(service.status as ServiceStatus);
                  return (
                    <div
                      key={service.name}
                      className={cn(
                        "rounded-lg border p-4 space-y-2",
                        statusColor(service.status as ServiceStatus),
                      )}
                      data-testid={`service-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{service.name}</p>
                        <Icon className="h-4 w-4 shrink-0" />
                      </div>
                      <p className="text-xs opacity-90">{STATUS_LABEL[service.status as ServiceStatus]}</p>
                      <p className="text-xs leading-relaxed">{service.message}</p>
                      {service.responseTimeMs != null && (
                        <p className="text-xs font-mono opacity-80">{service.responseTimeMs} ms</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
