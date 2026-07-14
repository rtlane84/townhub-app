import type { ServiceHealth } from "@workspace/api-client-react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceStatus = ServiceHealth["status"];

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: "Healthy",
  configured: "Configured",
  degraded: "Degraded",
  unavailable: "Unavailable",
  not_configured: "Not configured",
};

const METADATA_LABELS: Record<string, string> = {
  connected: "Connection status",
  connectionLatencyMs: "Query latency",
  schemaVersion: "Schema version",
  lastMigration: "Last migration",
  databaseSize: "Database size",
  connectionPoolUsage: "Connection pool",
  provider: "Provider",
  configured: "Configured",
  resendConfigured: "Resend configured",
  smtpConfigured: "SMTP configured",
  sentToday: "Sent today",
  failedToday: "Failed today",
  lastSuccessfulAt: "Last successful send",
  lastFailedAt: "Last failed send",
  mode: "Mode",
  billingConfigured: "Platform billing",
  connectConfigured: "Stripe Connect",
  webhookConfigured: "Webhook configured",
  lastWebhookReceivedAt: "Last webhook received",
  lastWebhookEventType: "Last webhook event",
  activeSubscriptions: "Active subscriptions",
  trialSubscriptions: "Trial subscriptions",
  pastDueSubscriptions: "Past due subscriptions",
  authProvider: "Auth provider",
  clerkConfigured: "Clerk configured",
  jwtConfigured: "JWT configured",
  supabaseConfigured: "Supabase configured",
  adminAccountCount: "Admin accounts",
  activeSessions: "Active sessions",
  enabled: "Enabled",
  location: "Location",
  configuredLocation: "Configured location",
  lastSuccessfulRefreshAt: "Last successful refresh",
  schedulerConfigured: "Scheduler configured",
  schedulerRunning: "Scheduler running",
  jobSecretConfigured: "JOB_SECRET configured",
  neverRun: "Has run",
  trialReminderEndpointAvailable: "Trial reminder endpoint",
  lastSuccessfulRunAt: "Last successful run",
  lastFailedRunAt: "Last failed run",
  lastFailedRunError: "Last failed run error",
  lastRunAt: "Last execution",
  lastRunOk: "Last run succeeded",
  lastRunError: "Last run error",
  nextScheduledRun: "Next scheduled run",
  bucket: "Bucket name",
  storageUsed: "Storage used",
  totalFiles: "Total files",
  logosStored: "Logos stored",
  galleryImages: "Gallery images",
  publicAssets: "Public assets",
  logosSupported: "Logos supported",
  galleryUploadsSupported: "Gallery uploads supported",
  publicAssetsSupported: "Public assets supported",
  tracesEnabled: "Performance tracing",
};

export function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return CheckCircle2;
    case "configured":
      return CheckCircle2;
    case "degraded":
    case "not_configured":
      return AlertTriangle;
    case "unavailable":
      return XCircle;
    default:
      return HelpCircle;
  }
}

export function statusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "text-green-700 bg-green-50 border-green-200";
    case "configured":
      return "text-sky-800 bg-sky-50 border-sky-200";
    case "degraded":
      return "text-amber-800 bg-amber-50 border-amber-200";
    case "not_configured":
      return "text-slate-700 bg-slate-50 border-slate-200";
    case "unavailable":
      return "text-red-700 bg-red-50 border-red-200";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatMetadataValue(key: string, value: string | number | boolean): string {
  if (key === "neverRun") return value ? "Never" : "Yes";
  if (key === "connected") return value ? "Connected" : "Disconnected";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && (key.endsWith("At") || key.includes("Time") || key === "nextScheduledRun")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (key === "connectionLatencyMs" && typeof value === "number") return `${value} ms`;
  if (key === "mode" && typeof value === "string") return value.toUpperCase();
  return String(value);
}

export function formatMetadata(metadata: ServiceHealth["metadata"]): Array<{ key: string; label: string; value: string }> {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([key, value]) => value !== "" && value !== false && !key.endsWith("Hint"))
    .map(([key, value]) => ({
      key,
      label: METADATA_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim(),
      value: formatMetadataValue(key, value),
    }));
}

export function pickService(services: ServiceHealth[], name: string): ServiceHealth | undefined {
  return services.find((service) => service.name === name);
}

export function ServiceCard({ service, compact = true }: { service: ServiceHealth; compact?: boolean }) {
  const Icon = statusIcon(service.status);
  const metadataItems = formatMetadata(service.metadata);

  return (
    <div
      className={cn(
        "rounded-lg border",
        compact ? "p-3 space-y-2" : "p-4 space-y-2",
        statusColor(service.status),
      )}
      data-testid={`service-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <p className="font-medium text-sm truncate">{service.name}</p>
          <span className="text-[11px] opacity-80 shrink-0">{STATUS_LABEL[service.status]}</span>
        </div>
        {service.responseTimeMs != null && (
          <span className="text-[11px] opacity-70 shrink-0">{service.responseTimeMs} ms</span>
        )}
      </div>
      <p className="text-xs leading-snug opacity-90">{service.message}</p>
      {metadataItems.length > 0 && (
        <dl className={cn("grid gap-x-4 gap-y-1", compact ? "grid-cols-1 sm:grid-cols-2 text-[11px]" : "grid-cols-1 text-xs")}>
          {metadataItems.map((item) => (
            <div key={item.key} className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground/90">{item.label}</dt>
              <dd className="font-medium sm:mt-0 text-right sm:text-left break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function DetailGrid({ items, compact = true }: { items: Array<{ label: string; value: string }>; compact?: boolean }) {
  return (
    <dl className={cn("grid gap-x-6", compact ? "grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs" : "grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm")}>
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium break-words sm:mt-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
