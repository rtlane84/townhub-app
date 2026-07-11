/** Public app URL for redirects (Stripe onboarding return URLs, checkout success). */
export function getAppBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}`;

  return "http://localhost:5173";
}

/**
 * Frontend origin for browser fallbacks after Stripe Checkout.
 * Prefer FRONTEND_BASE_URL when the API host is used as APP_BASE_URL by mistake.
 */
export function getFrontendBaseUrl(): string {
  const frontend = process.env.FRONTEND_BASE_URL?.trim();
  if (frontend) return frontend.replace(/\/$/, "");
  return getAppBaseUrl();
}
