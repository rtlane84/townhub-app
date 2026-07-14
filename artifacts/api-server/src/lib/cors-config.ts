import type { CorsOptions } from "cors";

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/\/+$/, "");
    }
    return null;
  }
}

function normalizeNativeOrigin(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "").toLowerCase();
  return /^(?:capacitor|app):\/\/localhost$/.test(trimmed) ? trimmed : null;
}

/** Origins allowed in production: APP_BASE_URL plus CORS_ALLOWED_ORIGINS. */
export function parseProductionAllowedOrigins(): string[] {
  const origins = new Set<string>();

  const appBase = process.env.APP_BASE_URL?.trim();
  if (appBase) {
    const origin = normalizeOrigin(appBase);
    if (origin) origins.add(origin);
  }

  const extra = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (extra) {
    for (const part of extra.split(",")) {
      const origin = normalizeOrigin(part);
      if (origin) origins.add(origin);
    }
  }

  const native = process.env.NATIVE_ALLOWED_ORIGINS?.trim();
  if (native) {
    for (const part of native.split(",")) {
      const origin = normalizeNativeOrigin(part);
      if (origin) origins.add(origin);
    }
  }

  return [...origins];
}

export function createCorsOptions(): CorsOptions {
  const credentials = true;

  if (process.env.NODE_ENV !== "production") {
    return { credentials, origin: true };
  }

  const allowedOrigins = parseProductionAllowedOrigins();

  return {
    credentials,
    origin(origin, callback) {
      // Non-browser clients (curl, health checks, Stripe) omit Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
}
