import type { ServiceHealth } from "@workspace/api-client-react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceStatus = ServiceHealth["status"];

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  unavailable: "Unavailable",
  not_configured: "Not configured",
};

const METADATA_LABELS: Record<string, string> = {
  connected: "Connected",
  connectionLatencyMs: "Connection latency",
  schemaVersion: "Schema management",
  apiVersion: "API version",
  provider: "Provider",
  configured: "Configured",
  resendConfigured: "Resend configured",
  smtpConfigured: "SMTP configured",
  lastSuccessfulAt: "Last successful",
  lastFailedAt: "Last failed",
  mode: "Mode",
  billingConfigured: "Platform billing configured",
  connectConfigured: "Stripe Connect configured",
  webhookConfigured: "Webhook configured",
  lastWebhookReceivedAt: "Last webhook received",
  lastWebhookEventType: "Last webhook event",
  authProvider: "Auth provider",
  clerkConfigured: "Clerk configured",
  jwtConfigured: "JWT configured",
  supabaseConfigured: "Supabase configured",
  adminAccountCount: "Admin accounts",
  enabled: "Enabled",
  configuredLocation: "Configured location",
  lastSuccessfulRefreshAt: "Last successful refresh",
  schedulerConfigured: "Scheduler configured",
  jobSecretConfigured: "JOB_SECRET configured",
  trialReminderEndpointAvailable: "Trial reminder endpoint",
  lastSuccessfulRunAt: "Last successful run",
  lastRunAt: "Last run",
  lastRunOk: "Last run succeeded",
  bucket: "Bucket",
  logosSupported: "Logos supported",
  galleryUploadsSupported: "Gallery uploads supported",
  publicAssetsSupported: "Public assets supported",
};

export function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "healthy":
      return CheckCircle2;
    case "warning":
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
    case "warning":
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
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && (key.endsWith("At") || key.includes("Time"))) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (key === "connectionLatencyMs" && typeof value === "number") return `${value} ms`;
  if (key === "mode" && typeof value === "string") return value.toUpperCase();
  return String(value);
}

export function formatMetadata(metadata: ServiceHealth["metadata"]): string[] {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([key, value]) => value !== "" && value !== false && !key.endsWith("Hint"))
    .map(([key, value]) => {
      const label = METADATA_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
      return `${label}: ${formatMetadataValue(key, value)}`;
    });
}

export function pickService(services: ServiceHealth[], name: string): ServiceHealth | undefined {
  return services.find((service) => service.name === name);
}

export function ServiceCard({ service }: { service: ServiceHealth }) {
  const Icon = statusIcon(service.status);
  const metadataLines = formatMetadata(service.metadata);

  return (
    <div
      className={cn("rounded-lg border p-4 space-y-2", statusColor(service.status))}
      data-testid={`service-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{service.name}</p>
        <Icon className="h-4 w-4 shrink-0" />
      </div>
      <p className="text-xs opacity-90">{STATUS_LABEL[service.status]}</p>
      <p className="text-xs leading-relaxed">{service.message}</p>
      {metadataLines.length > 0 && (
        <ul className="text-xs leading-relaxed space-y-0.5 opacity-90">
          {metadataLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DetailGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
