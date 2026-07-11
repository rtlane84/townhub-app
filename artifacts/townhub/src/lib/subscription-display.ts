export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  BETA: "Beta",
  TRIAL: "Trial",
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
  SUSPENDED: "Suspended",
  PAUSED: "Suspended",
  INCOMPLETE: "Incomplete",
};

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function isSubscriptionCancelScheduled(subscription: {
  cancelAtPeriodEnd?: boolean;
  status?: string;
}): boolean {
  return !!subscription.cancelAtPeriodEnd && subscription.status !== "CANCELED";
}

export function subscriptionStatusDisplayLabel(subscription: {
  status: string;
  cancelAtPeriodEnd?: boolean;
}): string {
  if (isSubscriptionCancelScheduled(subscription)) {
    const base = subscriptionStatusLabel(subscription.status);
    return `${base} · canceling`;
  }
  return subscriptionStatusLabel(subscription.status);
}

export function subscriptionAccessEndDate(subscription: {
  currentPeriodEnd?: string | Date | null;
  renewalAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
}): string | Date | null | undefined {
  return subscription.currentPeriodEnd ?? subscription.renewalAt ?? subscription.trialEndsAt;
}

export function formatPlanAmount(price: number, interval: "month" | "year" = "month"): string {
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}/${interval === "year" ? "yr" : "mo"}`;
}

export function isComplimentaryPricingPlan(plan: {
  isBeta?: boolean;
  monthlyPrice: number;
  yearlyPrice?: number | null;
}): boolean {
  if (plan.isBeta) return true;
  const yearly = plan.yearlyPrice ?? 0;
  return plan.monthlyPrice <= 0 && yearly <= 0;
}

export function pricingPlanCtaLabel(plan: { trialDays: number; monthlyPrice: number; yearlyPrice?: number | null; isBeta?: boolean }): string {
  if (isComplimentaryPricingPlan(plan)) return "Get Started";
  if (plan.trialDays > 0) return "Start Free Trial";
  return "Choose Plan";
}

export function trialDaysRemaining(trialEndsAt?: string | Date | null, now = new Date()): number | null {
  if (!trialEndsAt) return null;
  const end = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function subscriptionNeedsStripeCheckout(subscription: {
  status: string;
  stripeSubscriptionId?: string | null;
  plan?: { isBeta?: boolean; monthlyPrice: number; yearlyPrice?: number | null } | null;
}): boolean {
  const plan = subscription.plan;
  if (!plan || isComplimentaryPricingPlan(plan)) return false;
  if (!subscription.stripeSubscriptionId) return true;
  return ["INCOMPLETE", "CANCELED"].includes(subscription.status);
}

export function formatBillingIntervalLabel(interval?: string | null): string {
  if (interval === "yearly") return "Yearly";
  if (interval === "monthly") return "Monthly";
  return "Not set";
}

export function activePlanPrice(
  plan: { monthlyPrice: number; yearlyPrice?: number | null },
  interval?: string | null,
): string {
  if (interval === "yearly" && plan.yearlyPrice != null && plan.yearlyPrice > 0) {
    return formatPlanAmount(plan.yearlyPrice, "year");
  }
  return formatPlanAmount(plan.monthlyPrice);
}
