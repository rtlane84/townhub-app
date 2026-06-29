/** Public app URL for redirects (Stripe onboarding return URLs, checkout success). */
export function getAppBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}`;

  return "http://localhost:5173";
}
