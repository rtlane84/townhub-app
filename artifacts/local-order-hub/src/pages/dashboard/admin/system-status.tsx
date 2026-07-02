import {
  useGetAdminSystemHealth,
  getGetAdminSystemHealthQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { NotificationLogPanel } from "@/components/admin/notification-log-panel";
import { ApiErrorLogPanel } from "@/components/admin/api-error-log-panel";
import { RecentActivityPanel } from "@/components/admin/recent-activity-panel";
import {
  DetailGrid,
  ServiceCard,
  formatUptime,
  pickService,
  statusColor,
  statusIcon,
  STATUS_LABEL,
} from "@/components/admin/system-status-helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Server,
  Shield,
  CreditCard,
  Mail,
  MessageSquare,
  CloudSun,
  Clock,
  Database,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OverallStatus = "healthy" | "warning" | "error";

function OverallBadge({ status }: { status: OverallStatus }) {
  const mapped = status === "healthy" ? "healthy" : status === "warning" ? "warning" : "unavailable";
  const Icon = statusIcon(mapped);
  const label = status === "error" ? "Error" : STATUS_LABEL[mapped];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border",
        statusColor(mapped),
      )}
      data-testid="overall-status"
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  testId,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function AdminSystemStatus() {
  const queryClient = useQueryClient();
  const {
    data: health,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useGetAdminSystemHealth({
    query: {
      queryKey: getGetAdminSystemHealthQueryKey(),
      retry: 1,
    },
  });

  const handleRefresh = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-logs"] });
  };

  const isDevelopment = health?.application.environment !== "production";
  const services = health?.services ?? [];

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">System Status</h1>
            <p className="text-muted-foreground mt-1">
              Operational dashboard for production readiness and troubleshooting
            </p>
          </div>
          <div className="flex items-center gap-2">
            {health && <OverallBadge status={health.status} />}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {isDevelopment && (
          <Alert data-testid="dev-hint">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Local development</AlertTitle>
            <AlertDescription>
              Optional services like email, SMS, Stripe, and background jobs are often intentionally disabled locally.
              Not configured statuses are expected — focus on Database and Authentication for core platform health.
            </AlertDescription>
          </Alert>
        )}

        {isError && (
          <Alert variant="destructive" data-testid="health-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load full system health</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "The health endpoint is unavailable or you may not have admin access."}{" "}
              Other sections below may still be available.
            </AlertDescription>
          </Alert>
        )}

        <SectionCard title="Application" icon={Server} testId="application-section">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : health ? (
            <DetailGrid
              items={[
                { label: "Application version", value: health.application.version ?? "Not set" },
                { label: "Environment", value: health.application.environmentLabel },
                { label: "API version", value: health.application.apiVersion },
                { label: "Uptime", value: formatUptime(health.application.uptimeSeconds) },
                { label: "Build/start time", value: new Date(health.application.startTime).toLocaleString() },
                {
                  label: "APP_BASE_URL",
                  value: health.application.appBaseUrlConfigured ? "Configured" : "Not configured",
                },
                ...(health.application.buildDate
                  ? [{ label: "Build date", value: health.application.buildDate }]
                  : []),
                ...(health.application.commitSha
                  ? [{ label: "Commit", value: health.application.commitSha }]
                  : []),
                { label: "Last checked", value: new Date(health.application.timestamp).toLocaleString() },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Application details unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Database" icon={Database} testId="database-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Database") ? (
            <ServiceCard service={pickService(services, "Database")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Database status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Authentication" icon={Shield} testId="authentication-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Authentication") ? (
            <ServiceCard service={pickService(services, "Authentication")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Authentication status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Stripe" icon={CreditCard} testId="stripe-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Stripe") ? (
            <ServiceCard service={pickService(services, "Stripe")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Stripe status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Email" icon={Mail} testId="email-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Email") ? (
            <ServiceCard service={pickService(services, "Email")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Email status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="SMS" icon={MessageSquare} testId="sms-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "SMS") ? (
            <ServiceCard service={pickService(services, "SMS")!} />
          ) : (
            <p className="text-sm text-muted-foreground">SMS status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard title="Weather" icon={CloudSun} testId="weather-section">
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Weather") ? (
            <ServiceCard service={pickService(services, "Weather")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Weather status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Background Jobs"
          icon={Clock}
          description="Trial reminder emails and other scheduled tasks"
          testId="background-jobs-section"
        >
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Background Jobs") ? (
            <ServiceCard service={pickService(services, "Background Jobs")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Background job status unavailable.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Storage"
          icon={HardDrive}
          description="Logos, gallery uploads, and public assets"
          testId="storage-section"
        >
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pickService(services, "Storage") ? (
            <ServiceCard service={pickService(services, "Storage")!} />
          ) : (
            <p className="text-sm text-muted-foreground">Storage status unavailable.</p>
          )}
        </SectionCard>

        <NotificationLogPanel />

        {health && <ApiErrorLogPanel errors={health.apiErrors ?? []} />}

        {health && <RecentActivityPanel activity={health.recentActivity ?? []} />}

        {!health && !isLoading && (
          <SectionCard title="Operational Data" icon={Activity}>
            <p className="text-sm text-muted-foreground">
              API error log and recent activity will appear once system health loads.
            </p>
          </SectionCard>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
