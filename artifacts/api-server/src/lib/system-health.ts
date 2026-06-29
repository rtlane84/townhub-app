import { isEmailConfigured } from "./email";
import { isSmsConfigured } from "./sms";
import { getMediaStorageBackend } from "./media-storage";
import { getStripeKeyMode, validateStripeConfig } from "./stripe-config";

export type ServiceHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "not_configured";

export type SystemHealthStatus = "healthy" | "degraded" | "unhealthy";

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
  version?: string;
  buildDate?: string;
  commitSha?: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface SystemHealthReport {
  status: SystemHealthStatus;
  timestamp: string;
  application: ApplicationHealth;
  services: ServiceHealth[];
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

export function buildPublicHealthResponse(now = new Date()): PublicHealthResponse {
  return {
    status: "ok",
    timestamp: now.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export function buildApplicationHealth(now = new Date()): ApplicationHealth {
  return {
    name: process.env.APP_NAME?.trim() || "TownHub",
    environment: process.env.NODE_ENV?.trim() || "development",
    version: process.env.APP_VERSION?.trim() || undefined,
    buildDate: process.env.BUILD_DATE?.trim() || undefined,
    commitSha: process.env.GIT_COMMIT_SHA?.trim() || undefined,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: now.toISOString(),
  };
}

async function defaultDatabasePing(): Promise<void> {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@workspace/db");
  await db.execute(sql`SELECT 1`);
}

export async function checkDatabaseHealth(
  ping: DatabasePingFn = defaultDatabasePing,
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await ping();
    const responseTimeMs = Date.now() - start;
    return {
      name: "Database",
      status: "healthy",
      message: "Database connection OK",
      responseTimeMs,
    };
  } catch {
    const responseTimeMs = Date.now() - start;
    return {
      name: "Database",
      status: "unhealthy",
      message: "Database query failed",
      responseTimeMs,
    };
  }
}

export function checkApiHealth(): ServiceHealth {
  return {
    name: "API",
    status: "healthy",
    message: "API server is responding",
  };
}

export function checkStorageHealth(): ServiceHealth {
  const backend = getMediaStorageBackend();
  if (backend === "local") {
    const isProduction = process.env.NODE_ENV === "production";
    return {
      name: "Storage",
      status: isProduction ? "degraded" : "not_configured",
      message: isProduction
        ? "Using local filesystem storage (not recommended for production)"
        : "Local filesystem storage (development mode)",
      metadata: { mode: "local" },
    };
  }

  const url = process.env.SUPABASE_URL?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!url || !bucket || !hasServiceRoleKey) {
    return {
      name: "Storage",
      status: "unhealthy",
      message: "Supabase storage is not fully configured",
      metadata: {
        mode: "supabase",
        hasUrl: Boolean(url),
        hasBucket: Boolean(bucket),
        hasServiceRoleKey,
      },
    };
  }

  return {
    name: "Storage",
    status: "healthy",
    message: "Supabase storage configured",
    metadata: { mode: "supabase", bucket },
  };
}

export function checkEmailHealth(): ServiceHealth {
  if (isEmailConfigured()) {
    const provider = process.env.RESEND_API_KEY ? "resend" : "smtp";
    return {
      name: "Email",
      status: "healthy",
      message: "Email provider configured",
      metadata: { provider },
    };
  }
  return {
    name: "Email",
    status: "not_configured",
    message: "Email provider not configured (notifications will be logged only)",
  };
}

export function checkSmsHealth(): ServiceHealth {
  if (isSmsConfigured()) {
    return {
      name: "SMS",
      status: "healthy",
      message: "Twilio SMS configured",
      metadata: { provider: "twilio" },
    };
  }
  return {
    name: "SMS",
    status: "not_configured",
    message: "SMS provider not configured",
  };
}

export function checkStripeHealth(): ServiceHealth {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const mode = getStripeKeyMode(key);
  const validation = validateStripeConfig();

  if (mode === "mock") {
    return {
      name: "Stripe",
      status: "not_configured",
      message: "Stripe not configured (mock checkout mode)",
      metadata: { mode: "mock" },
    };
  }

  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  let status: ServiceHealthStatus = validation.ok ? "healthy" : "degraded";
  if (mode === "unknown") status = "degraded";
  if (mode === "live" && !webhookConfigured) status = "unhealthy";

  return {
    name: "Stripe",
    status,
    message: validation.ok
      ? `Stripe configured (${mode} mode)`
      : validation.issues[0] ?? "Stripe configuration incomplete",
    metadata: {
      mode,
      webhookConfigured,
      connectSupport: true,
      configIssueCount: validation.issues.length,
    },
  };
}

export function checkAuthHealth(): ServiceHealth {
  const hasSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim());
  const hasPublishable = Boolean(process.env.CLERK_PUBLISHABLE_KEY?.trim());

  if (hasSecret && hasPublishable) {
    return {
      name: "Auth",
      status: "healthy",
      message: "Clerk authentication configured",
      metadata: { provider: "clerk" },
    };
  }

  return {
    name: "Auth",
    status: "unhealthy",
    message: "Clerk authentication env vars are incomplete",
    metadata: {
      hasSecretKey: hasSecret,
      hasPublishableKey: hasPublishable,
    },
  };
}

export function checkWeatherGeocodingHealth(): ServiceHealth {
  const hasUserAgent = Boolean(process.env.GEOCODE_USER_AGENT?.trim());
  const isProduction = process.env.NODE_ENV === "production";

  if (!hasUserAgent && isProduction) {
    return {
      name: "Weather / Geocoding",
      status: "degraded",
      message: "GEOCODE_USER_AGENT not set (recommended for Nominatim)",
      metadata: { providers: "open-meteo,nominatim" },
    };
  }

  return {
    name: "Weather / Geocoding",
    status: "healthy",
    message: "Open-Meteo and Nominatim (no API keys required)",
    metadata: {
      providers: "open-meteo,nominatim",
      geocodeUserAgentConfigured: hasUserAgent,
    },
  };
}

export function deriveOverallStatus(services: ServiceHealth[]): SystemHealthStatus {
  const requiredNames = new Set(["Database", "Auth"]);
  let hasUnhealthyRequired = false;
  let hasDegraded = false;

  for (const service of services) {
    if (service.status === "unhealthy" && requiredNames.has(service.name)) {
      hasUnhealthyRequired = true;
    }
    if (service.status === "unhealthy" && service.name === "Storage") {
      hasUnhealthyRequired = true;
    }
    if (service.status === "degraded" || service.status === "not_configured") {
      hasDegraded = true;
    }
    if (service.status === "unhealthy" && !requiredNames.has(service.name) && service.name !== "Storage") {
      hasDegraded = true;
    }
  }

  if (hasUnhealthyRequired) return "unhealthy";
  if (hasDegraded) return "degraded";
  return "healthy";
}

export async function buildSystemHealthReport(
  options: { databasePing?: DatabasePingFn; now?: Date } = {},
): Promise<SystemHealthReport> {
  const now = options.now ?? new Date();
  const database = await checkDatabaseHealth(options.databasePing);

  const services: ServiceHealth[] = [
    checkApiHealth(),
    database,
    checkStorageHealth(),
    checkEmailHealth(),
    checkSmsHealth(),
    checkStripeHealth(),
    checkAuthHealth(),
    checkWeatherGeocodingHealth(),
  ];

  return {
    status: deriveOverallStatus(services),
    timestamp: now.toISOString(),
    application: buildApplicationHealth(now),
    services,
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
