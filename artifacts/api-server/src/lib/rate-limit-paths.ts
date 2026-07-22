/**
 * Path rules for API rate limiting (paths are relative to the /api mount).
 */

export const RATE_LIMIT_ERROR_MESSAGE =
  "Too many requests. Please try again shortly.";

/** Stripe retries webhooks; never count this route against a limit. */
export function isStripeWebhookPath(path: string): boolean {
  return path === "/checkout/webhook";
}

/** Authenticated owner dashboard polling — authorized in route handlers. */
export function isOwnerDashboardRoute(path: string, method: string): boolean {
  if (method !== "GET") return false;
  if (/^\/businesses\/\d+\/orders$/.test(path)) return true;
  if (/^\/businesses\/\d+\/orders\/summary$/.test(path)) return true;
  if (/^\/businesses\/\d+\/appointment-requests$/.test(path)) return true;
  if (/^\/businesses\/\d+\/live-events$/.test(path)) return true;
  return false;
}

export function shouldSkipRateLimit(path: string, _method: string): boolean {
  return isStripeWebhookPath(path);
}

export function isOrderLookupRoute(path: string, method: string): boolean {
  return method === "GET" && /^\/orders\/\d+$/.test(path);
}

export function isWriteLimitedRoute(path: string, method: string): boolean {
  if (method !== "POST") return false;
  if (path === "/orders") return true;
  if (path === "/orders/prep-estimate") return true;
  if (path === "/checkout/session") return true;
  if (path === "/checkout/intents") return true;
  if (path === "/checkout/confirm") return true;
  if (path === "/appointment-requests") return true;
  if (path === "/businesses/apply") return true;
  if (path === "/businesses/register") return true;
  if (path === "/support/reports") return true;
  if (path === "/media/upload") return true;
  if (/^\/businesses\/[^/]+\/food-truck-locations$/.test(path)) return true;
  return false;
}

export function isReadLimitedRoute(path: string, method: string): boolean {
  if (method !== "GET") return false;
  if (isOrderLookupRoute(path, method)) return false;
  if (path === "/media/optimize") return true;
  if (path === "/weather") return true;
  if (path === "/food-truck-locations/today") return true;
  if (path === "/food-truck-locations/upcoming") return true;
  return false;
}
