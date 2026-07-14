import {
  useGetAdminSystemHealth,
  getGetAdminSystemHealthQueryKey,
} from "@workspace/api-client-react";
import type { ServiceHealth } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCallback, useMemo, useState } from "react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { NotificationLogPanel } from "@/components/admin/notification-log-panel";
import { RecentActivityPanel } from "@/components/admin/recent-activity-panel";
import {
  PlatformSummaryCards,
  type AttentionCardAction,
} from "@/components/admin/platform-summary-cards";
import { BusinessMetricsSection } from "@/components/admin/business-metrics-section";
import { PlatformSection, PlatformHealthGrid, CompactSectionCard } from "@/components/admin/platform-section";
import {
  DetailGrid,
  ServiceCard,
  formatUptime,
  pickService,
} from "@/components/admin/system-status-helpers";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
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
  AlertTriangle,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";

function HealthBlock({
  isLoading,
  serviceName,
  services,
}: {
  isLoading: boolean;
  serviceName: string;
  services: ServiceHealth[];
}) {
  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  const service = pickService(services ?? [], serviceName);
  if (!service) {
    return <p className="text-xs text-muted-foreground">{serviceName} status unavailable.</p>;
  }
  return <ServiceCard service={service} />;
}

export default function AdminSystemStatus() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [notificationStatusFilter, setNotificationStatusFilter] = useState<
    "ALL" | "SENT" | "LOGGED" | "FAILED"
  >("ALL");
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
  const healthUnavailable = isError && !health;

  const failedNotificationsToday = useMemo(() => {
    const metrics = health?.metrics;
    if (!metrics) return health?.summary?.failedEmailsToday ?? undefined;
    return metrics.failedEmailsToday + metrics.failedSmsToday;
  }, [health?.metrics, health?.summary?.failedEmailsToday]);

  const handleAttentionAction = useCallback(
    (action: AttentionCardAction) => {
      if (action.type === "navigate") {
        setLocation(action.href);
        return;
      }
      if (action.notificationFilter) {
        setNotificationStatusFilter(action.notificationFilter);
      }
      requestAnimationFrame(() => {
        document.getElementById(action.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [setLocation],
  );

  return (
    <AdminDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Operations Center</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Current readiness, configuration checks, and operational logs — not a historical error archive
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {healthUnavailable ? (
          <Alert variant="destructive" data-testid="health-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>System health unavailable</AlertTitle>
            <AlertDescription className="text-sm">
              {error instanceof Error
                ? error.message
                : "The health endpoint is unavailable or you may not have admin access."}{" "}
              Platform status cards are hidden until health loads successfully. Notification and audit logs below
              remain available when those endpoints respond.
            </AlertDescription>
          </Alert>
        ) : (
          <PlatformSummaryCards
            summary={health?.summary}
            failedNotificationsToday={failedNotificationsToday}
            isLoading={isLoading && !health}
            onAction={handleAttentionAction}
          />
        )}

        {isDevelopment && health && (
          <Alert data-testid="dev-hint">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Local development.</span> Optional services like email, SMS, Stripe,
              Sentry, and background jobs are often intentionally disabled locally. Not configured statuses are
              expected — focus on Database reachability and Authentication configuration for core readiness.
            </AlertDescription>
          </Alert>
        )}

        {isError && health && (
          <Alert variant="destructive" data-testid="health-error-stale">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Unable to refresh system health.</span> Showing the last successful
              response.{" "}
              {error instanceof Error ? error.message : "Retry when the health endpoint is available."}
            </AlertDescription>
          </Alert>
        )}

        <PlatformSection
          title="Platform Health"
          description="Healthy means a real successful check. Configured means only credentials/settings were verified."
          testId="platform-health-section"
        >
          {healthUnavailable ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Service readiness cards are unavailable until the health endpoint responds.
              </AlertDescription>
            </Alert>
          ) : (
            <PlatformHealthGrid>
              <CompactSectionCard title="Application" icon={Server} testId="application-section">
                {isLoading && !health ? (
                  <Skeleton className="h-20 w-full" />
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
                  <p className="text-xs text-muted-foreground">Application details unavailable.</p>
                )}
              </CompactSectionCard>

              <CompactSectionCard title="Database" icon={Database} testId="database-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Database" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="Authentication" icon={Shield} testId="authentication-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Authentication" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="Stripe" icon={CreditCard} testId="stripe-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Stripe" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="Email" icon={Mail} testId="email-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Email" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="SMS" icon={MessageSquare} testId="sms-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="SMS" services={services} />
              </CompactSectionCard>

              <CompactSectionCard
                title="Storage"
                icon={HardDrive}
                description="Logos, gallery uploads, and public assets"
                testId="storage-section"
              >
                <HealthBlock isLoading={isLoading && !health} serviceName="Storage" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="Weather" icon={CloudSun} testId="weather-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Weather" services={services} />
              </CompactSectionCard>

              <CompactSectionCard title="Sentry" icon={Bug} testId="sentry-section">
                <HealthBlock isLoading={isLoading && !health} serviceName="Sentry" services={services} />
              </CompactSectionCard>

              <CompactSectionCard
                title="Background Jobs"
                icon={Clock}
                description="Trial reminder emails and scheduled tasks (external cron)"
                testId="background-jobs-section"
                className="lg:col-span-2"
              >
                <HealthBlock isLoading={isLoading && !health} serviceName="Background Jobs" services={services} />
              </CompactSectionCard>
            </PlatformHealthGrid>
          )}
        </PlatformSection>

        <PlatformSection
          title="Operational Logs"
          description="Durable notification delivery attempts and platform audit events — useful for troubleshooting, not proof that every service is healthy."
          testId="operational-monitoring-section"
        >
          <div className="space-y-4">
            <NotificationLogPanel
              statusFilter={notificationStatusFilter}
              onStatusFilterChange={setNotificationStatusFilter}
            />
            {health ? (
              <RecentActivityPanel activity={health.recentActivity ?? []} />
            ) : (
              !isLoading && (
                <p className="text-sm text-muted-foreground">
                  Platform audit log will appear once system health loads.
                </p>
              )
            )}
          </div>
        </PlatformSection>

        {!healthUnavailable && (
          <PlatformSection
            title="Business Metrics"
            description="Platform statistics for daily operations."
            testId="business-metrics-platform-section"
          >
            <BusinessMetricsSection metrics={health?.metrics} isLoading={isLoading && !health} />
          </PlatformSection>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
