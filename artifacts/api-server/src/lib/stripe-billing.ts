import { eq, or } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  businessesTable,
  businessSubscriptionsTable,
  subscriptionPlansTable,
  usersTable,
} from "@workspace/db";
import { getAppBaseUrl } from "./app-base-url";
import { stripe } from "./stripe";
import { findPlanById } from "./subscription-plans";
import {
  buildSubscriptionSyncFromStripe,
  isSubscriptionCheckoutSession,
  parseBillingIntervalFromMetadata,
  parseSubscriptionCheckoutBusinessId,
  parseSubscriptionCheckoutPlanId,
  validateSubscriptionCheckoutPlan,
  type BillingInterval,
  type SubscriptionSyncInput,
} from "./stripe-billing-core";

export {
  SUBSCRIPTION_CHECKOUT_METADATA_TYPE,
  buildSubscriptionSyncFromStripe,
  isComplimentaryPlan,
  isSubscriptionCheckoutSession,
  mapStripeSubscriptionStatus,
  parseBillingIntervalFromMetadata,
  parseSubscriptionCheckoutBusinessId,
  parseSubscriptionCheckoutPlanId,
  planStripePriceId,
  requiresStripeSubscription,
  resolveSubscriptionStatusFromStripe,
  subscriptionNeedsCheckout,
  trialDaysRemaining,
  validateSubscriptionCheckoutPlan,
  type BillingInterval,
  type MappedSubscriptionStatus,
  type SubscriptionSyncInput,
} from "./stripe-billing-core";

export async function findPlanByStripePriceId(priceId: string) {
  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(
      or(
        eq(subscriptionPlansTable.stripeMonthlyPriceId, priceId),
        eq(subscriptionPlansTable.stripeYearlyPriceId, priceId),
      ),
    );
  return plan;
}

export async function upsertBusinessSubscriptionFromStripe(input: SubscriptionSyncInput): Promise<void> {
  const renewalAt = input.trialEndsAt ?? input.currentPeriodEnd;
  const values = {
    planId: input.planId,
    status: input.status,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    stripePriceId: input.stripePriceId,
    billingInterval: input.billingInterval,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    trialEndsAt: input.trialEndsAt,
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    renewalAt,
  };

  const [existing] = await db
    .select({ id: businessSubscriptionsTable.id })
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, input.businessId));

  if (existing) {
    await db
      .update(businessSubscriptionsTable)
      .set(values)
      .where(eq(businessSubscriptionsTable.businessId, input.businessId));
    return;
  }

  await db.insert(businessSubscriptionsTable).values({
    businessId: input.businessId,
    startedAt: new Date(),
    ...values,
  });
}

async function resolveOwnerEmail(ownerId: string): Promise<string | undefined> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, ownerId));
  return user?.email ?? undefined;
}

export async function ensureStripeCustomerForBusiness(
  businessId: number,
): Promise<{ customerId: string; mockMode: boolean }> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    throw new Error("Business not found");
  }

  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  if (subscription?.stripeCustomerId) {
    return { customerId: subscription.stripeCustomerId, mockMode: false };
  }

  if (!stripe) {
    if (!subscription) {
      throw new Error("Subscription record required before mock billing");
    }
    const mockCustomerId = `cus_mock_${businessId}`;
    await db
      .update(businessSubscriptionsTable)
      .set({ stripeCustomerId: mockCustomerId })
      .where(eq(businessSubscriptionsTable.businessId, businessId));
    return { customerId: mockCustomerId, mockMode: true };
  }

  const ownerEmail = business.ownerId
    ? await resolveOwnerEmail(business.ownerId)
    : undefined;
  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: business.name,
    metadata: { businessId: String(businessId) },
  });

  if (subscription) {
    await db
      .update(businessSubscriptionsTable)
      .set({ stripeCustomerId: customer.id })
      .where(eq(businessSubscriptionsTable.businessId, businessId));
  } else {
    const defaultPlan = await findPlanById(1);
    await db.insert(businessSubscriptionsTable).values({
      businessId,
      planId: defaultPlan?.id ?? 1,
      status: "INCOMPLETE",
      startedAt: new Date(),
      stripeCustomerId: customer.id,
    });
  }

  return { customerId: customer.id, mockMode: false };
}

export type CreateSubscriptionCheckoutResult =
  | { ok: true; url: string; mockMode: boolean }
  | { ok: false; status: number; error: string };

export async function createSubscriptionCheckoutSession(input: {
  businessId: number;
  planId: number;
  interval: BillingInterval;
  userId?: string | null;
}): Promise<CreateSubscriptionCheckoutResult> {
  const plan = await findPlanById(input.planId);
  const validation = validateSubscriptionCheckoutPlan(plan, input.interval);
  if (!validation.ok) {
    return validation;
  }

  const priceId = validation.priceId;
  const appBaseUrl = getAppBaseUrl();
  const successUrl = `${appBaseUrl}/dashboard/business/subscription?checkout=success`;
  const cancelUrl = `${appBaseUrl}/dashboard/business/subscription?checkout=canceled`;

  const { customerId, mockMode } = await ensureStripeCustomerForBusiness(input.businessId);

  if (mockMode || !stripe) {
    return {
      ok: true,
      url: `${successUrl}&mock=1&planId=${input.planId}&interval=${input.interval}`,
      mockMode: true,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: "platform_subscription",
      businessId: String(input.businessId),
      planId: String(input.planId),
      userId: input.userId ?? "",
      billingInterval: input.interval,
    },
    subscription_data: {
      metadata: {
        businessId: String(input.businessId),
        planId: String(input.planId),
        type: "platform_subscription",
        billingInterval: input.interval,
      },
      trial_period_days: plan && plan.trialDays > 0 ? plan.trialDays : undefined,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Stripe did not return a checkout URL" };
  }

  return { ok: true, url: session.url, mockMode: false };
}

export type CreatePortalSessionResult =
  | { ok: true; url: string; mockMode: boolean }
  | { ok: false; status: number; error: string };

export async function createCustomerPortalSession(businessId: number): Promise<CreatePortalSessionResult> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  if (!subscription?.stripeCustomerId) {
    return { ok: false, status: 400, error: "No Stripe customer on file for this business" };
  }

  const returnUrl = `${getAppBaseUrl()}/dashboard/business/subscription?portal=return`;

  if (!stripe || subscription.stripeCustomerId.startsWith("cus_mock_")) {
    return { ok: true, url: `${returnUrl}?portal=mock`, mockMode: true };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  if (!session.url) {
    return { ok: false, status: 500, error: "Stripe did not return a portal URL" };
  }

  return { ok: true, url: session.url, mockMode: false };
}

async function resolveBusinessIdFromSubscription(subscription: Stripe.Subscription): Promise<{
  businessId: number;
  planId: number;
} | null> {
  const metadataBusinessId = subscription.metadata?.businessId;
  const metadataPlanId = subscription.metadata?.planId;
  if (metadataBusinessId && metadataPlanId) {
    const businessId = parseInt(metadataBusinessId, 10);
    const planId = parseInt(metadataPlanId, 10);
    if (Number.isFinite(businessId) && Number.isFinite(planId)) {
      return { businessId, planId };
    }
  }

  const [row] = await db
    .select({
      businessId: businessSubscriptionsTable.businessId,
      planId: businessSubscriptionsTable.planId,
    })
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.stripeSubscriptionId, subscription.id));

  if (!row) return null;
  return { businessId: row.businessId, planId: row.planId };
}

export async function syncBusinessSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription,
  eventType?: string,
): Promise<boolean> {
  if (eventType === "customer.subscription.deleted") {
    return handleSubscriptionDeleted(subscription);
  }

  const resolved = await resolveBusinessIdFromSubscription(subscription);
  if (!resolved) return false;

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planFromPrice = priceId ? await findPlanByStripePriceId(priceId) : null;
  const planId = planFromPrice?.id ?? resolved.planId;
  const plan = planFromPrice ?? (await findPlanById(planId));

  const syncInput = buildSubscriptionSyncFromStripe(
    resolved.businessId,
    planId,
    subscription,
    plan ?? null,
  );
  await upsertBusinessSubscriptionFromStripe(syncInput);
  return true;
}

export async function refreshBusinessSubscriptionFromStripe(
  businessId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe is not configured" };
  }

  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  if (!subscription) {
    return { ok: false, status: 404, error: "No subscription found for this business" };
  }

  if (!subscription.stripeSubscriptionId) {
    return { ok: false, status: 400, error: "No Stripe subscription to sync" };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  await syncBusinessSubscriptionFromStripeSubscription(stripeSubscription);
  return { ok: true };
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<boolean> {
  const resolved = await resolveBusinessIdFromSubscription(subscription);
  if (!resolved) return false;

  await db
    .update(businessSubscriptionsTable)
    .set({
      status: "CANCELED",
      cancelAtPeriodEnd: false,
      renewalAt: null,
    })
    .where(eq(businessSubscriptionsTable.businessId, resolved.businessId));

  return true;
}

export async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (!isSubscriptionCheckoutSession(session)) return false;

  const businessId = parseSubscriptionCheckoutBusinessId(session);
  const planId = parseSubscriptionCheckoutPlanId(session);
  if (!businessId || !planId) return false;

  if (!stripe || !session.subscription) {
    return false;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = await findPlanById(planId);
  const intervalOverride = parseBillingIntervalFromMetadata(session.metadata?.billingInterval);
  const syncInput = buildSubscriptionSyncFromStripe(
    businessId,
    planId,
    subscription,
    plan ?? null,
    { billingIntervalOverride: intervalOverride },
  );
  await upsertBusinessSubscriptionFromStripe(syncInput);
  return true;
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<boolean> {
  const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId || !stripe) return false;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return syncBusinessSubscriptionFromStripeSubscription(subscription);
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<boolean> {
  const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId || !stripe) return false;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return syncBusinessSubscriptionFromStripeSubscription(subscription);
}

export type ChangeSubscriptionPlanResult =
  | { ok: true; mode: "checkout"; url: string; mockMode: boolean }
  | { ok: true; mode: "updated" }
  | { ok: false; status: number; error: string };

export async function changeBusinessSubscriptionPlan(input: {
  businessId: number;
  planId: number;
  interval: BillingInterval;
  userId?: string | null;
}): Promise<ChangeSubscriptionPlanResult> {
  const plan = await findPlanById(input.planId);
  const validation = validateSubscriptionCheckoutPlan(plan, input.interval);
  if (!validation.ok) {
    return validation;
  }

  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, input.businessId));

  if (!subscription) {
    return { ok: false, status: 404, error: "No subscription found for this business" };
  }

  const samePlanAndInterval =
    subscription.planId === input.planId &&
    subscription.billingInterval === input.interval &&
    subscription.stripeSubscriptionId &&
    !["INCOMPLETE", "CANCELED"].includes(subscription.status);

  if (samePlanAndInterval) {
    return { ok: false, status: 400, error: "You are already on this plan and billing interval" };
  }

  if (!subscription.stripeSubscriptionId || ["INCOMPLETE", "CANCELED"].includes(subscription.status)) {
    const checkout = await createSubscriptionCheckoutSession(input);
    if (!checkout.ok) return checkout;
    return { ok: true, mode: "checkout", url: checkout.url, mockMode: checkout.mockMode };
  }

  if (!stripe || subscription.stripeSubscriptionId.startsWith("sub_mock")) {
    await db
      .update(businessSubscriptionsTable)
      .set({
        planId: input.planId,
        billingInterval: input.interval,
        stripePriceId: validation.priceId,
      })
      .where(eq(businessSubscriptionsTable.businessId, input.businessId));
    return { ok: true, mode: "updated" };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const itemId = stripeSubscription.items.data[0]?.id;
  if (!itemId) {
    return { ok: false, status: 500, error: "Stripe subscription has no billable item" };
  }

  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [{ id: itemId, price: validation.priceId }],
    metadata: {
      businessId: String(input.businessId),
      planId: String(input.planId),
      type: "platform_subscription",
      billingInterval: input.interval,
    },
    proration_behavior: "create_prorations",
  });

  await syncBusinessSubscriptionFromStripeSubscription(updated);
  return { ok: true, mode: "updated" };
}
