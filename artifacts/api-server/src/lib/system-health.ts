import { sql } from "drizzle-orm";
import { isEmailConfigured } from "./email";
import { isSmsConfigured } from "./sms";
import { getMediaStorageBackend } from "./media-storage";
import { getStripeKeyMode, validateStripeConfig } from "./stripe-config";
import { getLastTrialReminderJobRun } from "./background-jobs-run-state";
import {
  getLastStripeWebhookReceived,
  getLastWeatherRefresh,
  getProcessStartedAt,
  listApiErrors,
  type ApiErrorLogEntry,
} from "./system-runtime-state";
import {
  queryAdminAccountCount,
  queryDatabaseSchemaVersion,
  queryNotificationDeliverySummary,
  queryRecentPlatformActivity,
  type PlatformActivityEntry,
} from "./system-operational-queries";

export type ServiceHealthStatus =
  | "healthy"
  | "warning"
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

export interface SystemHealthReport {
  status: SystemHealthStatus;
  timestamp: string;
  application: ApplicationHealth;
  services: ServiceHealth[];
  apiErrors: ApiErrorLogEntry[];
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
  "STRIPE_WEBHOOK_SECRET",
];

function environmentLabel(nodeEnv: string): string {
  return nodeEnv === "production" ? "Production" : "Development";
}

function safeService(name: string, build: () => ServiceHealth | Promise<ServiceHealth>): Promise<ServiceHealth> {
  return Promise.resolve()
    .then(build)
    .catch((err: unknown) => ({
      name,
      status: "warning" as const,
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
  const schemaVersion = await queryDatabaseSchemaVersion();
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

export function checkStorageHealth(): ServiceHealth {
  const backend = getMediaStorageBackend();
  if (backend === "local") {
    const isProduction = process.env.NODE_ENV === "production";
    return {
      name: "Storage",
      status: isProduction ? "warning" : "not_configured",
      message: isProduction
        ? "Using local filesystem storage (not recommended for production)"
        : "Local filesystem storage for logos, gallery uploads, and public assets (development mode)",
      metadata: {
        mode: "local",
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
    status: "healthy",
    message: "Supabase storage configured for logos, gallery uploads, and public assets",
    metadata: {
      mode: "supabase",
      supabaseConfigured: true,
      bucket,
      logosSupported: true,
      galleryUploadsSupported: true,
      publicAssetsSupported: true,
    },
  };
}

export async function checkEmailHealth(): Promise<ServiceHealth> {
  const summary = await queryNotificationDeliverySummary("EMAIL");
  const configured = isEmailConfigured();
  const provider = process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : "none";

  if (configured) {
    return {
      name: "Email",
      status: "healthy",
      message: "Email provider configured",
      metadata: {
        provider,
        configured: true,
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
        smtpConfigured: Boolean(process.env.SMTP_HOST),
        ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
        ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
      },
    };
  }

  return {
    name: "Email",
    status: "not_configured",
    message: "Email provider not configured — notifications will be logged only until Resend or SMTP is set.",
    metadata: {
      provider: "none",
      configured: false,
      ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
      ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
    },
  };
}

export async function checkSmsHealth(): Promise<ServiceHealth> {
  const summary = await queryNotificationDeliverySummary("SMS");
  const configured = isSmsConfigured();

  if (configured) {
    return {
      name: "SMS",
      status: "healthy",
      message: "Twilio SMS configured",
      metadata: {
        provider: "twilio",
        configured: true,
        ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
        ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
      },
    };
  }

  return {
    name: "SMS",
    status: "not_configured",
    message: "Twilio SMS not configured",
    metadata: {
      provider: "none",
      configured: false,
      ...(summary.lastSuccessfulAt ? { lastSuccessfulAt: summary.lastSuccessfulAt } : {}),
      ...(summary.lastFailedAt ? { lastFailedAt: summary.lastFailedAt } : {}),
    },
  };
}

export function checkStripeHealth(): ServiceHealth {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const mode = getStripeKeyMode(key);
  const validation = validateStripeConfig();
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const billingConfigured = mode !== "mock";
  const lastWebhook = getLastStripeWebhookReceived();

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
        ...(lastWebhook
          ? { lastWebhookReceivedAt: lastWebhook.at, lastWebhookEventType: lastWebhook.eventType }
          : {}),
      },
    };
  }

  let status: ServiceHealthStatus = validation.ok ? "healthy" : "warning";
  if (mode === "unknown") status = "warning";
  if (mode === "live" && !webhookConfigured) status = "unavailable";

  return {
    name: "Stripe",
    status,
    message: validation.ok
      ? `Stripe configured (${mode} mode)`
      : validation.issues[0] ?? "Stripe configuration incomplete",
    metadata: {
      mode,
      billingConfigured,
      connectConfigured: billingConfigured,
      webhookConfigured,
      configIssueCount: validation.issues.length,
      ...(lastWebhook
        ? { lastWebhookReceivedAt: lastWebhook.at, lastWebhookEventType: lastWebhook.eventType }
        : {}),
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
      status: "healthy",
      message: "Clerk authentication configured (JWT session tokens)",
      metadata: {
        authProvider: "clerk",
        clerkConfigured: true,
        jwtConfigured: true,
        supabaseConfigured: supabaseUrl,
        ...(adminAccountCount != null ? { adminAccountCount } : {}),
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

  let status: ServiceHealthStatus = "healthy";
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
  }

  const metadata: Record<string, string | number | boolean> = {
    schedulerConfigured,
    jobSecretConfigured,
    trialReminderEndpointAvailable: true,
  };

  if (!jobSecretConfigured && process.env.NODE_ENV !== "production") {
    metadata.localDevJobsDisabledHint =
      "Local development often runs without background jobs — set JOB_SECRET and call the endpoint manually to test.";
  }

  if (lastRun) {
    metadata.lastSuccessfulRunAt = lastRun.ok ? lastRun.finishedAt : "";
    metadata.lastRunAt = lastRun.finishedAt;
    metadata.lastRunOk = lastRun.ok;
    if (lastRun.result) {
      metadata.lastRunScanned = lastRun.result.scanned;
      metadata.lastRunSent7Day = lastRun.result.sent7Day;
      metadata.lastRunSent1Day = lastRun.result.sent1Day;
      metadata.lastRunSkipped = lastRun.result.skipped;
    }
    if (lastRun.errorMessage) {
      metadata.lastRunError = lastRun.errorMessage;
    }
  }

  return {
    name: "Background Jobs",
    status,
    message,
    metadata,
  };
}

export async function checkWeatherHealth(): Promise<ServiceHealth> {
  const hasUserAgent = Boolean(process.env.GEOCODE_USER_AGENT?.trim());
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
    configuredLocation: weatherLocation,
    geocodeUserAgentConfigured: hasUserAgent,
    providers: "open-meteo,nominatim",
    ...(lastRefresh
      ? { lastSuccessfulRefreshAt: lastRefresh.at, lastRefreshLocation: lastRefresh.location }
      : {}),
  };

  if (weatherEnabled && !weatherLocation) {
    return {
      name: "Weather",
      status: "warning",
      message: "Weather is enabled in admin settings but no location is configured.",
      metadata: baseMetadata,
    };
  }

  if (!hasUserAgent && isProduction && weatherEnabled) {
    return {
      name: "Weather",
      status: "warning",
      message: "GEOCODE_USER_AGENT not set (recommended for Nominatim geocoding)",
      metadata: { ...baseMetadata, geocodeUserAgentConfigured: false },
    };
  }

  return {
    name: "Weather",
    status: weatherEnabled ? "healthy" : "not_configured",
    message: weatherEnabled
      ? "Weather widget enabled with Open-Meteo and Nominatim"
      : "Weather widget disabled in platform settings",
    metadata: baseMetadata,
  };
}

export function deriveOverallStatus(services: ServiceHealth[]): SystemHealthStatus {
  const fatalNames = new Set(["Database", "Authentication"]);
  let hasFatal = false;
  let hasWarning = false;

  for (const service of services) {
    if (service.status === "unavailable" && (fatalNames.has(service.name) || service.name === "Storage")) {
      hasFatal = true;
    }
    if (
      service.status === "warning" ||
      service.status === "not_configured" ||
      (service.status === "unavailable" && !fatalNames.has(service.name) && service.name !== "Storage")
    ) {
      hasWarning = true;
    }
  }

  if (hasFatal) return "error";
  if (hasWarning) return "warning";
  return "healthy";
}

export function buildFallbackHealthReport(
  reason: string,
  now = new Date(),
): SystemHealthReport {
  return {
    status: "warning",
    timestamp: now.toISOString(),
    application: buildApplicationHealth(now),
    services: [
      {
        name: "API",
        status: "healthy",
        message: "API server is responding",
      },
      {
        name: "System Health",
        status: "warning",
        message: reason,
      },
    ],
    apiErrors: listApiErrors(50),
    recentActivity: [],
  };
}

export async function buildSystemHealthReport(
  options: { databasePing?: DatabasePingFn; now?: Date } = {},
): Promise<SystemHealthReport> {
  const now = options.now ?? new Date();

  const [database, email, sms, auth, weather] = await Promise.all([
    safeService("Database", () => checkDatabaseHealth(options.databasePing)),
    safeService("Email", () => checkEmailHealth()),
    safeService("SMS", () => checkSmsHealth()),
    safeService("Authentication", () => checkAuthHealth()),
    safeService("Weather", () => checkWeatherHealth()),
  ]);

  const services: ServiceHealth[] = [
    checkApiHealth(),
    database,
    await safeService("Storage", () => checkStorageHealth()),
    email,
    sms,
    await safeService("Stripe", () => checkStripeHealth()),
    auth,
    weather,
    await safeService("Background Jobs", () => checkBackgroundJobsHealth()),
  ];

  const [recentActivity] = await Promise.all([
    queryRecentPlatformActivity(50).catch(() => [] as PlatformActivityEntry[]),
  ]);

  return {
    status: deriveOverallStatus(services),
    timestamp: now.toISOString(),
    application: buildApplicationHealth(now),
    services,
    apiErrors: listApiErrors(50),
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
