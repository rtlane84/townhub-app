/**
 * Path rules for API rate limiting (paths are relative to the /api mount).
 */

export const RATE_LIMIT_ERROR_MESSAGE =
  "Too many requests. Please try again shortly.";

/** Stripe retries webhooks; never count this route against a limit. */
export function isStripeWebhookPath(path: string): boolean {
  return path === "/checkout/webhook";
}

export function shouldSkipRateLimit(path: string, _method: string): boolean {
  return isStripeWebhookPath(path);
}

export function isWriteLimitedRoute(path: string, method: string): boolean {
  if (method !== "POST") return false;
  if (path === "/orders") return true;
  if (path === "/checkout/session") return true;
  if (path === "/appointment-requests") return true;
  if (path === "/businesses/apply") return true;
  if (path === "/businesses/register") return true;
  if (path === "/media/upload") return true;
  if (/^\/businesses\/[^/]+\/food-truck-locations$/.test(path)) return true;
  return false;
}

export function isReadLimitedRoute(path: string, method: string): boolean {
  if (method !== "GET") return false;
  if (path === "/weather") return true;
  if (path === "/food-truck-locations/today") return true;
  if (path === "/food-truck-locations/upcoming") return true;
  return false;
}
