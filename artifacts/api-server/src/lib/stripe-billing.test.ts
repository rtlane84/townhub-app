import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import {
  buildSubscriptionSyncFromStripe,
  isComplimentaryPlan,
  isSubscriptionCheckoutSession,
  mapStripeSubscriptionStatus,
  parseSubscriptionCheckoutBusinessId,
  planStripePriceId,
  requiresStripeSubscription,
  resolveSubscriptionStatusFromStripe,
  subscriptionNeedsCheckout,
  trialDaysRemaining,
  validateSubscriptionCheckoutPlan,
  SUBSCRIPTION_CHECKOUT_METADATA_TYPE,
} from "./stripe-billing-core";
import { parseCheckoutSessionOrderId } from "./stripe-config";
import { subscriptionGrantsFeaturesForPlan } from "./subscription-feature-keys";

function samplePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Pro",
    description: null,
    monthlyPrice: "29.00",
    yearlyPrice: "290.00",
    setupFee: null,
    transactionFeePercent: null,
    trialDays: 14,
    isActive: true,
    isDefault: false,
    isPublic: true,
    isRecommended: false,
    isBeta: false,
    sortOrder: 0,
    stripeProductId: "prod_test",
    stripeMonthlyPriceId: "price_monthly_test",
    stripeYearlyPriceId: "price_yearly_test",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

describe("stripe billing plan helpers", () => {
  it("treats beta and zero-price plans as complimentary", () => {
    assert.equal(isComplimentaryPlan(samplePlan({ isBeta: true, monthlyPrice: "49.00" })), true);
    assert.equal(isComplimentaryPlan(samplePlan({ monthlyPrice: "0", yearlyPrice: "0" })), true);
    assert.equal(requiresStripeSubscription(samplePlan()), true);
    assert.equal(requiresStripeSubscription(samplePlan({ monthlyPrice: "0", yearlyPrice: "0" })), false);
  });

  it("resolves Stripe price IDs by billing interval", () => {
    const plan = samplePlan();
    assert.equal(planStripePriceId(plan, "monthly"), "price_monthly_test");
    assert.equal(planStripePriceId(plan, "yearly"), "price_yearly_test");
    assert.equal(planStripePriceId(samplePlan({ stripeMonthlyPriceId: null }), "monthly"), null);
  });

  it("rejects complimentary and misconfigured paid plans for checkout", () => {
    const free = validateSubscriptionCheckoutPlan(samplePlan({ monthlyPrice: "0", yearlyPrice: "0" }), "monthly");
    assert.equal(free.ok, false);
    if (!free.ok) assert.equal(free.error, "This plan does not require Stripe checkout");

    const missingPrice = validateSubscriptionCheckoutPlan(
      samplePlan({ stripeMonthlyPriceId: null }),
      "monthly",
    );
    assert.equal(missingPrice.ok, false);
    if (!missingPrice.ok) {
      assert.match(missingPrice.error, /missing a Stripe price ID/i);
    }

    const ok = validateSubscriptionCheckoutPlan(samplePlan(), "monthly");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.priceId, "price_monthly_test");
  });
});

describe("stripe subscription status mapping", () => {
  it("maps Stripe subscription statuses to platform statuses", () => {
    assert.equal(mapStripeSubscriptionStatus("trialing"), "TRIAL");
    assert.equal(mapStripeSubscriptionStatus("active"), "ACTIVE");
    assert.equal(mapStripeSubscriptionStatus("past_due"), "PAST_DUE");
    assert.equal(mapStripeSubscriptionStatus("canceled"), "CANCELED");
    assert.equal(mapStripeSubscriptionStatus("unpaid"), "SUSPENDED");
    assert.equal(mapStripeSubscriptionStatus("incomplete"), "INCOMPLETE");
    assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "INCOMPLETE");
  });

  it("keeps active/trial access when cancel_at_period_end is set", () => {
    assert.equal(
      resolveSubscriptionStatusFromStripe({ status: "active", cancel_at_period_end: true }),
      "ACTIVE",
    );
    assert.equal(
      resolveSubscriptionStatusFromStripe({ status: "trialing", cancel_at_period_end: true }),
      "TRIAL",
    );
    assert.equal(
      resolveSubscriptionStatusFromStripe({ status: "canceled", cancel_at_period_end: false }),
      "CANCELED",
    );
  });

  it("builds sync payload from Stripe subscription objects", () => {
    const subscription = {
      id: "sub_123",
      customer: "cus_123",
      status: "trialing",
      trial_end: 1_700_000_000,
      current_period_start: 1_699_000_000,
      current_period_end: 1_701_000_000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: "price_monthly_test" } }] },
      metadata: { businessId: "10", planId: "2" },
    } as Stripe.Subscription;

    const sync = buildSubscriptionSyncFromStripe(10, 2, subscription, samplePlan());
    assert.equal(sync.businessId, 10);
    assert.equal(sync.planId, 2);
    assert.equal(sync.status, "TRIAL");
    assert.equal(sync.billingInterval, "monthly");
    assert.equal(sync.stripeSubscriptionId, "sub_123");
  });

  it("syncs yearly billing interval from Stripe price id", () => {
    const subscription = {
      id: "sub_yearly",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ price: { id: "price_yearly_test" } }] },
      metadata: { businessId: "10", planId: "2" },
    } as Stripe.Subscription;

    const sync = buildSubscriptionSyncFromStripe(10, 2, subscription, samplePlan());
    assert.equal(sync.billingInterval, "yearly");
  });

  it("reads billing period from subscription items when root fields are absent", () => {
    const subscription = {
      id: "sub_item_period",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: true,
      cancel_at: 1_702_000_000,
      items: {
        data: [
          {
            price: { id: "price_monthly_test" },
            current_period_start: 1_701_000_000,
            current_period_end: 1_702_000_000,
          },
        ],
      },
      metadata: { businessId: "10", planId: "2" },
    } as Stripe.Subscription;

    const sync = buildSubscriptionSyncFromStripe(10, 2, subscription, samplePlan());
    assert.equal(sync.cancelAtPeriodEnd, true);
    assert.equal(sync.currentPeriodEnd?.toISOString(), new Date(1_702_000_000 * 1000).toISOString());
    assert.equal(sync.status, "ACTIVE");
  });

  it("treats future cancel_at on active subscriptions as scheduled cancellation", () => {
    const subscription = {
      id: "sub_cancel_at",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: false,
      cancel_at: 1_702_000_000,
      items: { data: [{ price: { id: "price_monthly_test" } }] },
    } as Stripe.Subscription;

    const sync = buildSubscriptionSyncFromStripe(10, 2, subscription, samplePlan());
    assert.equal(sync.cancelAtPeriodEnd, true);
  });
});

describe("checkout session discrimination", () => {
  it("identifies subscription checkout sessions separately from order payments", () => {
    const orderSession = {
      mode: "payment",
      metadata: { orderId: "42", connectedAccountId: "acct_123" },
    } as Stripe.Checkout.Session;

    const subscriptionSession = {
      mode: "subscription",
      metadata: {
        type: SUBSCRIPTION_CHECKOUT_METADATA_TYPE,
        businessId: "7",
        planId: "3",
      },
    } as Stripe.Checkout.Session;

    assert.equal(isSubscriptionCheckoutSession(orderSession), false);
    assert.equal(parseCheckoutSessionOrderId(orderSession), 42);
    assert.equal(isSubscriptionCheckoutSession(subscriptionSession), true);
    assert.equal(parseCheckoutSessionOrderId(subscriptionSession), null);
    assert.equal(parseSubscriptionCheckoutBusinessId(subscriptionSession), 7);
  });
});

describe("subscription entitlement helpers", () => {
  it("locks paid plans in incomplete/canceled states but keeps complimentary access", () => {
    assert.equal(subscriptionGrantsFeaturesForPlan("INCOMPLETE", false), false);
    assert.equal(subscriptionGrantsFeaturesForPlan("CANCELED", false), false);
    assert.equal(subscriptionGrantsFeaturesForPlan("ACTIVE", false), true);
    assert.equal(subscriptionGrantsFeaturesForPlan("PAST_DUE", false), true);
    assert.equal(subscriptionGrantsFeaturesForPlan("CANCELED", true), true);
    assert.equal(subscriptionGrantsFeaturesForPlan("SUSPENDED", true), false);
  });

  it("detects when a business still needs Stripe checkout", () => {
    const plan = samplePlan();
    assert.equal(
      subscriptionNeedsCheckout(
        { status: "INCOMPLETE", stripeSubscriptionId: null, planId: plan.id } as never,
        plan,
      ),
      true,
    );
    assert.equal(
      subscriptionNeedsCheckout(
        { status: "ACTIVE", stripeSubscriptionId: "sub_1", planId: plan.id } as never,
        plan,
      ),
      false,
    );
  });

  it("computes trial days remaining", () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    assert.equal(trialDaysRemaining(inThreeDays), 3);
    assert.equal(trialDaysRemaining(new Date(Date.now() - 1000)), 0);
  });
});
