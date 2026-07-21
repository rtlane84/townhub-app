import { sql } from "drizzle-orm";
import { isEmailConfigured } from "./email";
import { isSmsConfigured } from "./sms";
import { getMediaStorageBackend } from "./media-storage";
import { getStripeKeyMode, validateStripeConfig } from "./stripe-config";
import { isWeatherKitConfigured } from "./weatherkit";
import { hasAnyStripeWebhookSecret } from "./stripe-webhook-verify";
import {
  estimateNextTrialReminderRun,
  getLastFailedTrialReminderJobRun,
  getLastSuccessfulTrialReminderJobRun,
  getLastTrialReminderJobRun,
  isSchedulerRecentlyActive,
} from "./background-jobs-run-state";
import {
  getLastStripeWebhookReceived,
  getLastWeatherRefresh,
  getProcessStartedAt,
} from "./system-runtime-state";
import {
  queryAdminAccountCount,
  queryDatabaseSchemaVersion,
  queryLastMigrationHint,
  queryNotificationDeliverySummary,
  queryRecentPlatformActivity,
  queryStripeSubscriptionCounts,
  type PlatformActivityEntry,
} from "./system-operational-queries";
import {
  queryDatabaseStats,
  queryNotificationChannelCountsToday,
  queryPlatformMetrics,
  queryStorageUsageStats,
  type PlatformMetrics,
} from "./platform-metrics";

export type ServiceHealthStatus =
  | "healthy"
  | "configured"
  | "degraded"
  | "unavailable"
  | "not_configured";

export type SystemHealthStatus = "healthy" | "warning" | "error";

export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  message: string;
  responseTimeMs?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ApplicationHealth {
  name: string;
  environment: string;
  environmentLabel: string;
  version?: string;
  apiVersion: string;
  buildDate?: string;
  commitSha?: string;
  uptimeSeconds: number;
  timestamp: string;
  startTime: string;
  appBaseUrlConfigured: boolean;
}

export interface PlatformHealthSummary {
  overallStatus: SystemHealthStatus;
  activeBusinesses: number | null;
  pendingApplications: number | null;
  activeSubscriptions: number | null;
  trialSubscriptions: number | null;
  pastDueSubscriptions: number | null;
  ordersToday: number | null;
  emailsSentToday: number | null;
  failedEmailsToday: number | null;
}

export interface SystemHealthReport {
  status: SystemHealthStatus;
  timestamp: string;
  application: ApplicationHealth;
  summary: PlatformHealthSummary;
  metrics: PlatformMetrics | null;
  services: ServiceHealth[];
  recentActivity: PlatformActivityEntry[];
}

export interface PublicHealthResponse {
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
}

export type DatabasePingFn = () => Promise<void>;

const SECRET_SUBSTRINGS = [
  "sk_",
  "pk_",
  "whsec_",
  "service_role",
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "TWILIO_AUTH_TOKEN",
  "SMTP_PASS",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_CONNECT_WEBHOOK_SECRET",
  "STRIPE_PLATFORM_WEBHOOK_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "ingest.sentry.io",
];

const OPTIONAL_SERVICE_NAMES = new Set([
  "Email",
  "SMS",
  "Stripe",
  "Weather",
  "Background Jobs",
  "Sentry",
]);

function environmentLabel(nodeEnv: string): string {
  return nodeEnv === "production" ? "Production" : "Development";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function safeService(name: string, build: () => ServiceHealth | Promise<ServiceHealth>): Promise<ServiceHealth> {
  return Promise.resolve()
    .then(build)
    .catch((err: unknown) => ({
      name,
      status: "degraded" as const,
      message:
        err instanceof Error
          ? `${name} check failed: ${err.message}`
          : `${name} check failed unexpectedly`,
    }));
}

export function buildPublicHealthResponse(now = new Date()): PublicHealthResponse {
  return {
    status: "ok",
    timestamp: now.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export function buildApplicationHealth(now = new Date()): ApplicationHealth {
  const environment = process.env.NODE_ENV?.trim() || "development";
  return {
    name: process.env.APP_NAME?.trim() || "TownHub",
    environment,
    environmentLabel: environmentLabel(environment),
    version: process.env.APP_VERSION?.trim() || undefined,
    apiVersion: process.env.API_VERSION?.trim() || process.env.APP_VERSION?.trim() || "0.0.0",
    buildDate: process.env.BUILD_DATE?.trim() || undefined,
    commitSha: process.env.GIT_COMMIT_SHA?.trim() || undefined,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: now.toISOString(),
    startTime: getProcessStartedAt(),
    appBaseUrlConfigured: Boolean(process.env.APP_BASE_URL?.trim()),
  };
}

async function defaultDatabasePing(): Promise<void> {
  const { db } = await import("@workspace/db");
  await db.execute(sql`SELECT 1`);
}

export async function checkDatabaseHealth(
  ping: DatabasePingFn = defaultDatabasePing,
): Promise<ServiceHealth> {
  const start = Date.now();
  const [schemaVersion, migrationHint, dbStats] = await Promise.all([
    queryDatabaseSchemaVersion(),
    queryLastMigrationHint(),
    queryDatabaseStats(),
  ]);

  try {
    await ping();
    const responseTimeMs = Date.now() - start;
    return {
      name: "Database",
      status: "healthy",
      message: "Database connection OK",
      responseTimeMs,
      metadata: {
        connected: true,
        connectionLatencyMs: responseTimeMs,
        ...(schemaVersion ? { schemaVersion } : {}),
        ...(migrationHint ? { lastMigration: migrationHint } : {}),
        ...(dbStats.sizeBytes != null ? { databaseSize: formatBytes(dbStats.sizeBytes) } : {}),
        ...(dbStats.connectionPoolHint ? { connectionPoolUsage: dbStats.connectionPoolHint } : {}),
      },
    };
  } catch {
    const responseTimeMs = Date.now() - start;
    return {
      name: "Database",
      status: "unavailable",
      message: "Database is unreachable — verify database connection settings and network connectivity.",
      responseTimeMs,
      metadata: {
        connected: false,
        connectionLatencyMs: responseTimeMs,
        ...(schemaVersion ? { schemaVersion } : {}),
        ...(migrationHint ? { lastMigration: migrationHint } : {}),
      },
    };
  }
}

export function checkApiHealth(): ServiceHealth {
  return {
    name: "API",
    status: "healthy",
    message: "API server is responding",
    metadata: { apiVersion: process.env.API_VERSION?.trim() || process.env.APP_VERSION?.trim() || "0.0.0" },
  };
}

export async function checkStorageHealth(): Promise<ServiceHealth> {
  const backend = getMediaStorageBackend();
  const usage = await queryStorageUsageStats();

  if (backend === "local") {
    const isProduction = process.env.NODE_ENV === "production";
    return {
      name: "Storage",
      status: isProduction ? "degraded" : "configured",
      message: isProduction
        ? "Using local filesystem storage (not recommended for production)"
        : "Local filesystem storage configured for logos, gallery uploads, and public assets (development)",
      metadata: {
        mode: "local",
        bucket: "local-filesystem",
        ...(usage
          ? {
              totalFiles: usage.totalFiles,
              storageUsed: formatBytes(usage.totalBytes),
              logosStored: usage.logosStored,
              galleryImages: usage.galleryImages,
              publicAssets: usage.publicAssets,
            }
          : {}),
        logosSupported: true,
        galleryUploadsSupported: true,
        publicAssetsSupported: true,
      },
    };
  }

  const url = process.env.SUPABASE_URL?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!url || !bucket || !hasServiceRoleKey) {
    return {
      name: "Storage",
      status: "unavailable",
      message: "Supabase storage is not fully configured for logos, gallery uploads, and public assets",
      metadata: {
        mode: "supabase",
        supabaseConfigured: false,
        hasUrl: Boolean(url),
        hasBucket: Boolean(bucket),
        hasServiceRoleKey,
      },
    };
  }

  return {
    name: "Storage",
    status: "configured",
    message: "Supabase storage credentials are configured (no live bucket check performed)",
    metadata: {
      mode: "supabase",
      supabaseConfigured: true,
      bucket,
      ...(usage
        ? {
            totalFiles: usage.totalFiles,
            storageUsed: formatBytes(usage.totalBytes),
            logosStored: usage.logosStored,
            galleryImages: usage.galleryImages,
            publicAssets: usage.publicAssets,
          }
        : {}),
      logosSupported: true,
      galleryUploadsSupported: true,
      publicAssetsSupported: true,
    },
  };
}

export async function checkEmailHealth(): Promise<ServiceHealth> {
  const [summary, counts] = await Promise.all([
    queryNotificationDeliverySummary("EMAIL"),
    queryNotificationChannelCountsToday("EMAIL"),
  ]);
  const configured = isEmailConfigured();
  const provider = process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : "none";

  const baseMetadata: Record<string, string | number | boolean> = {
    provider,
    configured,
    sentToday: counts.sentToday,
    failedToday: counts.failedToday,
    ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
    ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
  };

  if (configured) {
    return {
      name: "Email",
      status: "configured",
      message: "Email provider credentials are configured (delivery outcomes below are from durable logs)",
      metadata: {
        ...baseMetadata,
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
        smtpConfigured: Boolean(process.env.SMTP_HOST),
      },
    };
  }

  return {
    name: "Email",
    status: "not_configured",
    message: "Email provider not configured — notifications will be logged only until Resend or SMTP is set.",
    metadata: baseMetadata,
  };
}

export async function checkSmsHealth(): Promise<ServiceHealth> {
  const [summary, counts] = await Promise.all([
    queryNotificationDeliverySummary("SMS"),
    queryNotificationChannelCountsToday("SMS"),
  ]);
  const configured = isSmsConfigured();

  const baseMetadata: Record<string, string | number | boolean> = {
    provider: configured ? "twilio" : "none",
    configured,
    sentToday: counts.sentToday,
    failedToday: counts.failedToday,
    ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
    ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
  };

  if (configured) {
    return {
      name: "SMS",
      status: "configured",
      message: "Twilio SMS credentials are configured (delivery outcomes below are from durable logs)",
      metadata: baseMetadata,
    };
  }

  return {
    name: "SMS",
    status: "not_configured",
    message: "Twilio SMS not configured",
    metadata: baseMetadata,
  };
}

export async function checkStripeHealth(): Promise<ServiceHealth> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const mode = getStripeKeyMode(key);
  const validation = validateStripeConfig();
  const webhookConfigured = hasAnyStripeWebhookSecret();
  const connectWebhookConfigured = Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim());
  const platformWebhookConfigured = Boolean(process.env.STRIPE_PLATFORM_WEBHOOK_SECRET?.trim());
  const legacyWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const billingConfigured = mode !== "mock";
  const lastWebhook = getLastStripeWebhookReceived();
  const subscriptionCounts = await queryStripeSubscriptionCounts();

  const webhookMetadata = {
    ...(lastWebhook
      ? { lastWebhookReceivedAt: lastWebhook.at, lastWebhookEventType: lastWebhook.eventType }
      : {}),
    ...(subscriptionCounts
      ? {
          activeSubscriptions: subscriptionCounts.active,
          trialSubscriptions: subscriptionCounts.trial,
          pastDueSubscriptions: subscriptionCounts.pastDue,
        }
      : {}),
  };

  if (mode === "mock") {
    return {
      name: "Stripe",
      status: "not_configured",
      message: "Stripe Billing not configured (mock checkout mode)",
      metadata: {
        mode: "mock",
        billingConfigured: false,
        connectConfigured: false,
        webhookConfigured,
        connectWebhookConfigured,
        platformWebhookConfigured,
        legacyWebhookConfigured,
        ...webhookMetadata,
      },
    };
  }

  let status: ServiceHealthStatus = validation.ok ? "configured" : "degraded";
  if (mode === "unknown") status = "degraded";
  if (mode === "live" && !webhookConfigured) status = "unavailable";

  return {
    name: "Stripe",
    status,
    message: validation.ok
      ? `Stripe credentials configured (${mode} mode; no live Stripe API call performed)`
      : validation.issues[0] ?? "Stripe configuration incomplete",
    metadata: {
      mode,
      billingConfigured,
      connectConfigured: billingConfigured,
      webhookConfigured,
      connectWebhookConfigured,
      platformWebhookConfigured,
      legacyWebhookConfigured,
      configIssueCount: validation.issues.length,
      ...webhookMetadata,
    },
  };
}

export async function checkAuthHealth(): Promise<ServiceHealth> {
  const hasSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim());
  const hasPublishable = Boolean(process.env.CLERK_PUBLISHABLE_KEY?.trim());
  const adminAccountCount = await queryAdminAccountCount();
  const supabaseUrl = Boolean(process.env.SUPABASE_URL?.trim());

  if (hasSecret && hasPublishable) {
    return {
      name: "Authentication",
      status: "configured",
      message: "Clerk authentication credentials are configured (no live Clerk session check performed)",
      metadata: {
        authProvider: "clerk",
        clerkConfigured: true,
        jwtConfigured: true,
        supabaseConfigured: supabaseUrl,
        ...(adminAccountCount != null ? { adminAccountCount } : {}),
        activeSessions: "Managed by Clerk (not available locally)",
      },
    };
  }

  return {
    name: "Authentication",
    status: "unavailable",
    message: "Clerk authentication env vars are incomplete",
    metadata: {
      authProvider: "clerk",
      clerkConfigured: false,
      jwtConfigured: hasSecret,
      supabaseConfigured: supabaseUrl,
      hasSecretKey: hasSecret,
      hasPublishableKey: hasPublishable,
      ...(adminAccountCount != null ? { adminAccountCount } : {}),
    },
  };
}

export function checkBackgroundJobsHealth(): ServiceHealth {
  const jobSecretConfigured = Boolean(process.env.JOB_SECRET?.trim());
  const schedulerConfigured = Boolean(process.env.JOB_CRON_CONFIGURED?.trim());
  const lastRun = getLastTrialReminderJobRun();
  const lastSuccess = getLastSuccessfulTrialReminderJobRun();
  const lastFailed = getLastFailedTrialReminderJobRun();
  const schedulerRunning = schedulerConfigured && jobSecretConfigured && isSchedulerRecentlyActive();
  const nextRun = estimateNextTrialReminderRun();

  let status: ServiceHealthStatus = "configured";
  let message = "Background jobs are configured and the trial reminder endpoint is available.";

  if (!jobSecretConfigured) {
    status = "not_configured";
    message =
      process.env.NODE_ENV === "production"
        ? "JOB_SECRET is not set — trial reminder emails require background job configuration."
        : "Background jobs are disabled locally (JOB_SECRET not set). This is normal for development.";
  } else if (!schedulerConfigured) {
    status = "not_configured";
    message =
      "External cron scheduler is not confirmed. Schedule POST /api/internal/jobs/subscription-trial-reminders daily.";
  } else if (!lastRun) {
    status = "degraded";
    message = "Scheduler is configured but no job has run yet — the external cron may not have executed yet.";
  } else if (!schedulerRunning) {
    status = "degraded";
    message = "Scheduler has not run recently — verify the external cron is active.";
  } else if (lastSuccess) {
    status = "healthy";
    message = "Trial reminder job has run successfully and the scheduler remains active.";
  }

  const metadata: Record<string, string | number | boolean> = {
    schedulerConfigured,
    schedulerRunning,
    jobSecretConfigured,
    trialReminderEndpointAvailable: true,
    neverRun: !lastRun,
  };

  if (!jobSecretConfigured && process.env.NODE_ENV !== "production") {
    metadata.localDevJobsDisabledHint =
      "Local development often runs without background jobs — set JOB_SECRET and call the endpoint manually to test.";
  }

  if (lastRun) {
    metadata.lastRunAt = lastRun.finishedAt;
    metadata.lastRunOk = lastRun.ok;
    if (lastRun.errorMessage) {
      metadata.lastRunError = lastRun.errorMessage;
    }
    if (lastRun.result) {
      metadata.lastRunScanned = lastRun.result.scanned;
      metadata.lastRunSent7Day = lastRun.result.sent7Day;
      metadata.lastRunSent1Day = lastRun.result.sent1Day;
      metadata.lastRunSkipped = lastRun.result.skipped;
    }
  }

  if (lastSuccess) {
    metadata.lastSuccessfulRunAt = lastSuccess.finishedAt;
  }

  if (lastFailed) {
    metadata.lastFailedRunAt = lastFailed.finishedAt;
    if (lastFailed.errorMessage) {
      metadata.lastFailedRunError = lastFailed.errorMessage;
    }
  }

  if (nextRun) {
    metadata.nextScheduledRun = nextRun;
  }

  return {
    name: "Background Jobs",
    status,
    message,
    metadata,
  };
}

export async function checkWeatherHealth(): Promise<ServiceHealth> {
  const weatherKitConfigured = isWeatherKitConfigured();
  const hasCoordinates = Number.isFinite(Number(process.env.WEATHERKIT_LATITUDE)) &&
    Number.isFinite(Number(process.env.WEATHERKIT_LONGITUDE));
  const isProduction = process.env.NODE_ENV === "production";
  const lastRefresh = getLastWeatherRefresh();

  let weatherEnabled = false;
  let weatherLocation = "";

  try {
    const { db, platformSettingsTable } = await import("@workspace/db");
    const [row] = await db.select().from(platformSettingsTable).limit(1);
    weatherEnabled = row?.weatherEnabled ?? false;
    weatherLocation = row?.weatherLocation?.trim() ?? row?.townName?.trim() ?? "";
  } catch {
    // Platform settings unavailable — report runtime state only.
  }

  const baseMetadata = {
    enabled: weatherEnabled,
    location: weatherLocation || "Not set",
    provider: "apple-weatherkit",
    weatherKitConfigured,
    coordinatesConfigured: hasCoordinates,
    ...(lastRefresh
      ? { lastSuccessfulRefreshAt: lastRefresh.at, lastRefreshLocation: lastRefresh.location }
      : {}),
  };

  if (!weatherEnabled) {
    return {
      name: "Weather",
      status: "not_configured",
      message: "Weather widget disabled in platform settings",
      metadata: baseMetadata,
    };
  }

  if (!weatherLocation) {
    return {
      name: "Weather",
      status: "degraded",
      message: "Weather is enabled in admin settings but no location is configured.",
      metadata: baseMetadata,
    };
  }

  if ((!weatherKitConfigured || !hasCoordinates) && isProduction) {
    return {
      name: "Weather",
      status: "degraded",
      message: "WeatherKit credentials or coordinates are not configured",
      metadata: { ...baseMetadata, weatherKitConfigured, coordinatesConfigured: hasCoordinates },
    };
  }

  if (lastRefresh) {
    return {
      name: "Weather",
      status: "healthy",
      message: "Weather widget enabled; last successful refresh recorded for this process",
      metadata: baseMetadata,
    };
  }

  return {
    name: "Weather",
    status: "configured",
    message: "Weather widget is enabled with location configured (no refresh recorded yet for this process)",
    metadata: baseMetadata,
  };
}

export function checkSentryHealth(): ServiceHealth {
  const configured = Boolean(process.env.SENTRY_DSN?.trim());

  if (configured) {
    return {
      name: "Sentry",
      status: "configured",
      message: "API Sentry DSN is configured (error monitoring only; DSN not exposed)",
      metadata: {
        configured: true,
        tracesEnabled: false,
      },
    };
  }

  return {
    name: "Sentry",
    status: "not_configured",
    message:
      process.env.NODE_ENV === "production"
        ? "API Sentry is not configured — errors will not be reported."
        : "API Sentry is not configured (optional in development).",
    metadata: {
      configured: false,
      tracesEnabled: false,
    },
  };
}

export function deriveOverallStatus(services: ServiceHealth[]): SystemHealthStatus {
  const isProduction = process.env.NODE_ENV === "production";
  const fatalNames = new Set(["Database", "Authentication"]);
  let hasFatal = false;
  let hasWarning = false;

  for (const service of services) {
    if (service.status === "unavailable" && (fatalNames.has(service.name) || service.name === "Storage")) {
      hasFatal = true;
      continue;
    }

    if (service.status === "unavailable") {
      hasWarning = true;
      continue;
    }

    if (service.status === "degraded") {
      hasWarning = true;
      continue;
    }

    if (service.status === "not_configured") {
      // Optional services unset in development are expected and should not look critically broken.
      if (isProduction || !OPTIONAL_SERVICE_NAMES.has(service.name)) {
        hasWarning = true;
      }
      continue;
    }

    // "configured" and "healthy" do not lower overall status on their own.
  }

  if (hasFatal) return "error";
  if (hasWarning) return "warning";
  return "healthy";
}

function buildHealthSummary(
  status: SystemHealthStatus,
  metrics: PlatformMetrics | null,
): PlatformHealthSummary {
  return {
    overallStatus: status,
    activeBusinesses: metrics?.activeBusinesses ?? null,
    pendingApplications: metrics?.pendingApplications ?? null,
    activeSubscriptions: metrics?.activeSubscriptions ?? null,
    trialSubscriptions: metrics?.trialSubscriptions ?? null,
    pastDueSubscriptions: metrics?.pastDueSubscriptions ?? null,
    ordersToday: metrics?.ordersToday ?? null,
    emailsSentToday: metrics?.emailsSentToday ?? null,
    failedEmailsToday: metrics?.failedEmailsToday ?? null,
  };
}

export function buildFallbackHealthReport(
  reason: string,
  now = new Date(),
): SystemHealthReport {
  const status: SystemHealthStatus = "error";
  return {
    status,
    timestamp: now.toISOString(),
    application: buildApplicationHealth(now),
    summary: buildHealthSummary(status, null),
    metrics: null,
    services: [
      {
        name: "API",
        status: "degraded",
        message: "Health report assembly failed — API process is up but readiness could not be fully verified",
      },
      {
        name: "System Health",
        status: "unavailable",
        message: reason,
      },
    ],
    recentActivity: [],
  };
}

export async function buildSystemHealthReport(
  options: { databasePing?: DatabasePingFn; now?: Date } = {},
): Promise<SystemHealthReport> {
  const now = options.now ?? new Date();

  const [database, email, sms, auth, weather, stripe, storage, metrics] = await Promise.all([
    safeService("Database", () => checkDatabaseHealth(options.databasePing)),
    safeService("Email", () => checkEmailHealth()),
    safeService("SMS", () => checkSmsHealth()),
    safeService("Authentication", () => checkAuthHealth()),
    safeService("Weather", () => checkWeatherHealth()),
    safeService("Stripe", () => checkStripeHealth()),
    safeService("Storage", () => checkStorageHealth()),
    queryPlatformMetrics().catch(() => null),
  ]);

  const services: ServiceHealth[] = [
    checkApiHealth(),
    database,
    storage,
    email,
    sms,
    stripe,
    auth,
    weather,
    await safeService("Background Jobs", () => checkBackgroundJobsHealth()),
    checkSentryHealth(),
  ];

  const [recentActivity] = await Promise.all([
    queryRecentPlatformActivity(50).catch(() => [] as PlatformActivityEntry[]),
  ]);

  const status = deriveOverallStatus(services);

  return {
    status,
    timestamp: now.toISOString(),
    application: buildApplicationHealth(now),
    summary: buildHealthSummary(status, metrics),
    metrics,
    services,
    recentActivity,
  };
}

/** Test helper — ensure health payloads never leak secrets. */
export function assertHealthPayloadSafe(payload: unknown): void {
  const json = JSON.stringify(payload);
  for (const fragment of SECRET_SUBSTRINGS) {
    if (json.includes(fragment)) {
      throw new Error(`Health payload contains forbidden fragment: ${fragment}`);
    }
  }
}

// Re-export types used by other modules
export type { PlatformActivityEntry, PlatformMetrics };
