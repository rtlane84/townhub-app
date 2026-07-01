export type BillingInterval = "monthly" | "yearly";

export function resolveApprovalBillingInterval(
  bodyInterval?: BillingInterval | null,
  applicationInterval?: BillingInterval | null,
): BillingInterval {
  return bodyInterval ?? applicationInterval ?? "monthly";
}

export function formatApplicationBillingInterval(
  interval?: BillingInterval | null,
): "Monthly" | "Yearly" | null {
  if (interval === "yearly") return "Yearly";
  if (interval === "monthly") return "Monthly";
  return null;
}

export function isBusinessActive(business: { archivedAt?: Date | null }): boolean {
  return business.archivedAt == null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "TRIAL",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
]);

export function hasActivePaidSubscription(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

/** Cancel in Stripe when a real subscription id exists and is not already canceled. */
export function shouldCancelStripeSubscription(
  status: string,
  stripeSubscriptionId: string | null | undefined,
): boolean {
  if (!stripeSubscriptionId?.trim()) return false;
  if (stripeSubscriptionId.startsWith("sub_mock")) return false;
  if (status === "CANCELED") return false;
  return true;
}
