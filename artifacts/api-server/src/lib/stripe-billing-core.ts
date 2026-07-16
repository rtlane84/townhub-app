import type Stripe from "stripe";

export const SUBSCRIPTION_CHECKOUT_METADATA_TYPE = "platform_subscription";

export type BillingInterval = "monthly" | "yearly";

export type BillingPlanFields = {
  isActive?: boolean;
  isBeta: boolean;
  monthlyPrice: string;
  yearlyPrice?: string | null;
  stripeMonthlyPriceId?: string | null;
  stripeYearlyPriceId?: string | null;
};

export type BillingSubscriptionFields = {
  status: string;
  stripeSubscriptionId?: string | null;
};

export function isComplimentaryPlan(plan: Pick<BillingPlanFields, "isBeta" | "monthlyPrice" | "yearlyPrice">): boolean {
  if (plan.isBeta) return true;
  const monthly = parseFloat(plan.monthlyPrice);
  const yearly = plan.yearlyPrice ? parseFloat(plan.yearlyPrice) : 0;
  return monthly <= 0 && yearly <= 0;
}

export function requiresStripeSubscription(plan: Pick<BillingPlanFields, "isBeta" | "monthlyPrice" | "yearlyPrice">): boolean {
  return !isComplimentaryPlan(plan);
}

/**
 * Status when an admin assigns a plan outside Stripe.
 * Paid plans without an existing Stripe subscription stay INCOMPLETE (features locked until owner checkout).
 * Complimentary / beta plans unlock immediately.
 * When a Stripe subscription already exists, keep the requested status (admin override).
 */
export function resolveAdminAssignedSubscriptionStatus(input: {
  plan: Pick<BillingPlanFields, "isBeta" | "monthlyPrice" | "yearlyPrice"> & { trialDays?: number | null };
  requestedStatus: string;
  existingStripeSubscriptionId?: string | null;
}): string {
  if (isComplimentaryPlan(input.plan)) {
    if (input.plan.isBeta) return "BETA";
    const trialDays = input.plan.trialDays ?? 0;
    return trialDays > 0 ? "TRIAL" : "ACTIVE";
  }
  if (!input.existingStripeSubscriptionId?.trim()) {
    return "INCOMPLETE";
  }
  return input.requestedStatus;
}

export function planStripePriceId(
  plan: Pick<BillingPlanFields, "stripeMonthlyPriceId" | "stripeYearlyPriceId">,
  interval: BillingInterval,
): string | null {
  const priceId = interval === "yearly" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
  return priceId?.trim() || null;
}

export function isSubscriptionCheckoutSession(session: Stripe.Checkout.Session): boolean {
  if (session.mode === "subscription") return true;
  return session.metadata?.type === SUBSCRIPTION_CHECKOUT_METADATA_TYPE;
}

export function parseSubscriptionCheckoutBusinessId(session: Stripe.Checkout.Session): number | null {
  const raw = session.metadata?.businessId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseSubscriptionCheckoutPlanId(session: Stripe.Checkout.Session): number | null {
  const raw = session.metadata?.planId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export type MappedSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "SUSPENDED"
  | "INCOMPLETE";

export function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): MappedSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "TRIAL";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "SUSPENDED";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    case "paused":
      return "SUSPENDED";
    default:
      return "INCOMPLETE";
  }
}

/**
 * Maps Stripe subscription state to TownHub status.
 * When cancel_at_period_end is set, access continues until period end (ACTIVE/TRIAL).
 */
export function resolveSubscriptionStatusFromStripe(
  subscription: Pick<Stripe.Subscription, "status" | "cancel_at_period_end">,
): MappedSubscriptionStatus {
  if (subscription.status === "canceled") {
    return "CANCELED";
  }

  if (subscription.cancel_at_period_end) {
    if (subscription.status === "trialing") return "TRIAL";
    if (subscription.status === "active") return "ACTIVE";
  }

  return mapStripeSubscriptionStatus(subscription.status);
}

export function parseBillingIntervalFromMetadata(
  value: string | null | undefined,
): BillingInterval | null {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

function stripeUnixToDate(value: number | null | undefined): Date | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Date(value * 1000);
}

type StripeSubscriptionPeriodFields = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type StripeSubscriptionItemPeriodFields = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

/** Stripe may expose billing period on the subscription root or on line items (newer API versions). */
export function extractStripeSubscriptionPeriodStart(subscription: Stripe.Subscription): Date | null {
  const root = subscription as StripeSubscriptionPeriodFields;
  const fromRoot = stripeUnixToDate(root.current_period_start);
  if (fromRoot) return fromRoot;

  const firstItem = subscription.items.data[0] as StripeSubscriptionItemPeriodFields | undefined;
  return stripeUnixToDate(firstItem?.current_period_start);
}

export function extractStripeSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const root = subscription as StripeSubscriptionPeriodFields;
  const fromRoot = stripeUnixToDate(root.current_period_end);
  if (fromRoot) return fromRoot;

  const firstItem = subscription.items.data[0] as StripeSubscriptionItemPeriodFields | undefined;
  const fromItem = stripeUnixToDate(firstItem?.current_period_end);
  if (fromItem) return fromItem;

  return stripeUnixToDate(subscription.cancel_at);
}

export function resolveCancelAtPeriodEndFromStripe(subscription: Stripe.Subscription): boolean {
  if (subscription.cancel_at_period_end) return true;
  if (!subscription.cancel_at) return false;
  return subscription.status === "active" || subscription.status === "trialing";
}

function resolveBillingInterval(
  priceId: string | null | undefined,
  plan: BillingPlanFields | null,
): BillingInterval | null {
  if (!priceId?.trim()) return null;
  if (plan?.stripeYearlyPriceId && priceId === plan.stripeYearlyPriceId) return "yearly";
  if (plan?.stripeMonthlyPriceId && priceId === plan.stripeMonthlyPriceId) return "monthly";
  return null;
}

export type SubscriptionSyncInput = {
  businessId: number;
  planId: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: MappedSubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  billingInterval: BillingInterval | null;
};

export function buildSubscriptionSyncFromStripe(
  businessId: number,
  planId: number,
  subscription: Stripe.Subscription,
  plan: BillingPlanFields | null,
  options?: { billingIntervalOverride?: BillingInterval | null },
): SubscriptionSyncInput {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const intervalFromPrice = resolveBillingInterval(priceId, plan);
  const intervalFromMetadata = parseBillingIntervalFromMetadata(subscription.metadata?.billingInterval);
  return {
    businessId,
    planId,
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: resolveSubscriptionStatusFromStripe(subscription),
    trialEndsAt: stripeUnixToDate(subscription.trial_end),
    currentPeriodStart: extractStripeSubscriptionPeriodStart(subscription),
    currentPeriodEnd: extractStripeSubscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: resolveCancelAtPeriodEndFromStripe(subscription),
    billingInterval: options?.billingIntervalOverride ?? intervalFromPrice ?? intervalFromMetadata,
  };
}

export function validateSubscriptionCheckoutPlan(
  plan: BillingPlanFields | undefined,
  interval: BillingInterval,
): { ok: true; priceId: string } | { ok: false; status: number; error: string } {
  if (!plan || plan.isActive === false) {
    return { ok: false, status: 404, error: "Plan not found" };
  }

  if (isComplimentaryPlan(plan)) {
    return { ok: false, status: 400, error: "This plan does not require Stripe checkout" };
  }

  const priceId = planStripePriceId(plan, interval);
  if (!priceId) {
    return {
      ok: false,
      status: 400,
      error: "Plan is missing a Stripe price ID for the selected billing interval",
    };
  }

  return { ok: true, priceId };
}

export function subscriptionNeedsCheckout(
  subscription: BillingSubscriptionFields,
  plan: BillingPlanFields,
): boolean {
  if (!requiresStripeSubscription(plan)) return false;
  if (!subscription.stripeSubscriptionId) return true;
  return ["INCOMPLETE", "CANCELED"].includes(subscription.status);
}

const STRIPE_SUBSCRIPTION_SYNC_PRIORITY = ["trialing", "active", "past_due"] as const;

/** Pick the Stripe subscription row to sync after checkout when local stripeSubscriptionId is missing. */
export function pickStripeSubscriptionToSync<T extends { status: string; created: number }>(
  subscriptions: T[],
): T | null {
  if (subscriptions.length === 0) return null;
  for (const status of STRIPE_SUBSCRIPTION_SYNC_PRIORITY) {
    const match = subscriptions.find((sub) => sub.status === status);
    if (match) return match;
  }
  return [...subscriptions].sort((a, b) => b.created - a.created)[0] ?? null;
}

export function trialDaysRemaining(trialEndsAt: Date | null | undefined, now = new Date()): number | null {
  if (!trialEndsAt) return null;
  const diffMs = trialEndsAt.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
