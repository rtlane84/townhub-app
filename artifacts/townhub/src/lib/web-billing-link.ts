export const OWNER_SUBSCRIPTION_WEB_PATH = "/dashboard/business/subscription";

/** Build the public-website URL for owner subscription / Stripe Billing management. */
export function getOwnerSubscriptionWebUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(base)) {
    throw new Error("Owner subscription web URL requires an HTTPS base.");
  }
  return `${base}${OWNER_SUBSCRIPTION_WEB_PATH}`;
}
