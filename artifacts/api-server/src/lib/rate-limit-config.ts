function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

export function isRateLimitDisabled(): boolean {
  const raw = process.env.RATE_LIMIT_DISABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function shouldTrustProxyForRateLimit(): boolean {
  const raw = process.env.RATE_LIMIT_TRUST_PROXY?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return process.env.NODE_ENV === "production";
}

/** Public write endpoints — strict but enough for checkout retries. */
export function writeRateLimitMax(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_WRITE_MAX, 60);
}

export function writeRateLimitWindowMs(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS, 15 * 60 * 1000);
}

/** Expensive public reads (weather, map-related aggregates). */
export function readRateLimitMax(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_READ_MAX, 120);
}

export function readRateLimitWindowMs(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_READ_WINDOW_MS, 15 * 60 * 1000);
}

/** Guest order lookup — stricter than general reads to slow enumeration. */
export function orderLookupRateLimitMax(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_ORDER_LOOKUP_MAX, 30);
}

export function orderLookupRateLimitWindowMs(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_ORDER_LOOKUP_WINDOW_MS, 15 * 60 * 1000);
}

/** Baseline limit for all other /api traffic. */
export function generalRateLimitMax(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX, 300);
}

export function generalRateLimitWindowMs(): number {
  return parsePositiveInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 15 * 60 * 1000);
}
