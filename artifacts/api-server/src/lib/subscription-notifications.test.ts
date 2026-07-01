import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSubscriptionWelcomeEmail,
  buildSubscriptionTrialStartedEmail,
  buildSubscriptionPaymentFailedEmail,
  buildSubscriptionCancelScheduledEmail,
  buildSubscriptionCanceledEmail,
  buildSubscriptionPaymentSucceededEmail,
} from "./email-templates/subscription-emails";
import {
  calendarDaysUntil,
  detectSubscriptionNotificationEvents,
  formatSubscriptionPriceLabel,
  shouldSkipTrialStartedEmail,
} from "./subscription-notification-core";

const baseSnapshot = {
  status: "ACTIVE",
  planId: 1,
  cancelAtPeriodEnd: false,
  trialEndsAt: null,
  currentPeriodEnd: new Date("2026-07-24T00:00:00Z"),
  renewalAt: new Date("2026-07-24T00:00:00Z"),
  billingInterval: "monthly",
  stripeSubscriptionId: "sub_123",
};

const sampleEmailData = {
  businessId: 1,
  businessName: "Clay Diner",
  planName: "Pro",
  statusLabel: "Trial",
  trialEndsAt: "2026-07-01T00:00:00Z",
  billingInterval: "monthly" as const,
  priceLabel: "$29.00/month",
  amountCharged: "$29.00/month",
  nextBillingDate: "2026-07-01T00:00:00Z",
  cancellationDate: "2026-07-24T00:00:00Z",
  subscriptionUrl: "https://townhub.test/dashboard/business/subscription",
  businessHubUrl: "https://townhub.test/dashboard/business",
  manageBillingUrl: "https://billing.stripe.com/session/test",
  reactivateSubscriptionUrl: "https://townhub.test/dashboard/business/subscription",
  helpCenterUrl: "https://townhub.test/help",
  welcomeVideoUrl: "https://townhub.test/help#welcome-video",
  businessOwnerTrainingUrl: "https://townhub.test/help#business-owner-training",
  customerTrainingUrl: "https://townhub.test/help#customer-training",
};

describe("subscription notification event detection", () => {
  it("sends only welcome on checkout completion", () => {
    const events = detectSubscriptionNotificationEvents(null, baseSnapshot, { type: "checkout_completed" });
    assert.deepEqual(events, ["SUBSCRIPTION_WELCOME"]);
  });

  it("sends only welcome on admin attach even for trial plans", () => {
    const trial = { ...baseSnapshot, status: "TRIAL", trialEndsAt: new Date("2026-07-01T00:00:00Z") };
    const events = detectSubscriptionNotificationEvents(null, trial, { type: "admin_attach" });
    assert.deepEqual(events, ["SUBSCRIPTION_WELCOME"]);
  });

  it("detects cancel scheduled separately from full cancellation", () => {
    const active = { ...baseSnapshot, status: "ACTIVE" };
    const scheduled = { ...active, cancelAtPeriodEnd: true };
    assert.deepEqual(
      detectSubscriptionNotificationEvents(active, scheduled, { type: "stripe_sync" }),
      ["SUBSCRIPTION_CANCEL_SCHEDULED"],
    );

    const canceled = { ...scheduled, status: "CANCELED" };
    assert.deepEqual(
      detectSubscriptionNotificationEvents(scheduled, canceled, { type: "subscription_deleted" }),
      ["SUBSCRIPTION_CANCELED"],
    );
  });

  it("skips trial started when welcome already sent or in batch", () => {
    assert.equal(
      shouldSkipTrialStartedEmail({
        event: "SUBSCRIPTION_TRIAL_STARTED",
        source: { type: "checkout_completed" },
        welcomeInBatch: true,
        welcomeAlreadySent: false,
      }),
      true,
    );
    assert.equal(
      shouldSkipTrialStartedEmail({
        event: "SUBSCRIPTION_TRIAL_STARTED",
        source: { type: "stripe_sync", stripeEvent: "customer.subscription.created" },
        welcomeInBatch: false,
        welcomeAlreadySent: true,
      }),
      true,
    );
  });

  it("detects activation, recurring payment, and payment failure transitions", () => {
    const trial = { ...baseSnapshot, status: "TRIAL" };
    const active = { ...baseSnapshot, status: "ACTIVE" };
    assert.deepEqual(
      detectSubscriptionNotificationEvents(trial, active, { type: "stripe_sync" }),
      ["SUBSCRIPTION_ACTIVATED"],
    );

    assert.deepEqual(
      detectSubscriptionNotificationEvents(active, active, {
        type: "invoice_paid",
        billingReason: "subscription_cycle",
      }),
      ["SUBSCRIPTION_PAYMENT_SUCCEEDED"],
    );

    const pastDue = { ...baseSnapshot, status: "PAST_DUE" };
    assert.deepEqual(
      detectSubscriptionNotificationEvents(active, pastDue, { type: "invoice_payment_failed" }),
      ["SUBSCRIPTION_PAYMENT_FAILED"],
    );
  });

  it("maps expired vs canceled after failed payments", () => {
    const pastDue = { ...baseSnapshot, status: "PAST_DUE" };
    const canceled = { ...baseSnapshot, status: "CANCELED" };
    assert.deepEqual(
      detectSubscriptionNotificationEvents(pastDue, canceled, { type: "subscription_deleted" }),
      ["SUBSCRIPTION_EXPIRED"],
    );

    assert.deepEqual(
      detectSubscriptionNotificationEvents(activeSnapshot(), canceled, { type: "subscription_deleted" }),
      ["SUBSCRIPTION_CANCELED"],
    );
  });
});

function activeSnapshot() {
  return { ...baseSnapshot, status: "ACTIVE" };
}

describe("subscription email templates", () => {
  it("builds branded welcome email with next steps and business hub CTA", () => {
    const email = buildSubscriptionWelcomeEmail(sampleEmailData);
    assert.match(email.subject, /Welcome to TownHub/);
    assert.match(email.html, /Next Steps/);
    assert.match(email.html, /Open Business Hub/);
    assert.match(email.html, /Watch Quick Start Video/);
    assert.match(email.html, /Business Owner Help Center/);
    assert.match(email.html, /Watch the Business Owner Quick Start video/);
    assert.match(email.html, /Publish your business and start accepting customers/);
    assert.match(email.html, /Stripe continues to send official payment receipts/);
    assert.doesNotMatch(email.html, /Manage Billing/);
    assert.doesNotMatch(email.html, /Upload your logo/i);
    assert.doesNotMatch(email.html, /Trial started/);
  });

  it("builds trial started email with the same onboarding next steps", () => {
    const email = buildSubscriptionTrialStartedEmail(sampleEmailData);
    assert.match(email.html, /Your trial has started/);
    assert.match(email.html, /Open Business Hub/);
    assert.match(email.html, /Watch Quick Start Video/);
    assert.match(email.html, /Finish building your storefront/);
    assert.doesNotMatch(email.html, /Manage Billing/);
  });

  it("builds payment failed email with status, grace period, and update CTA", () => {
    const email = buildSubscriptionPaymentFailedEmail({
      ...sampleEmailData,
      statusLabel: "Past due",
      manageBillingUrl: "https://townhub.test/dashboard/business/subscription?open=billing",
    });

    assert.match(email.subject, /payment failed/i);
    assert.match(email.html, /Update Payment Method/);
    assert.match(email.html, /Past due/);
    assert.match(email.html, /retries payment/);
  });

  it("differentiates scheduled cancel from full cancellation", () => {
    const scheduled = buildSubscriptionCancelScheduledEmail(sampleEmailData);
    assert.match(scheduled.subject, /Cancellation scheduled/i);
    assert.match(scheduled.html, /remains/);
    assert.match(scheduled.html, /Manage Billing/);

    const canceled = buildSubscriptionCanceledEmail(sampleEmailData);
    assert.match(canceled.subject, /Subscription ended/i);
    assert.match(canceled.html, /Paid features have been disabled/);
    assert.match(canceled.html, /Reactivate Subscription/);
  });

  it("builds recurring payment email with amount and next billing date", () => {
    const email = buildSubscriptionPaymentSucceededEmail({
      ...sampleEmailData,
      statusLabel: "Active",
      amountCharged: "$29.00/month",
      nextBillingDate: "2026-08-01T00:00:00Z",
    });

    assert.match(email.html, /Amount charged/);
    assert.match(email.html, /Next billing date/);
    assert.match(email.html, /not a receipt/);
    assert.match(email.html, /Manage Billing/);
  });
});

describe("subscription formatting helpers", () => {
  it("formats plan prices by billing interval", () => {
    assert.equal(
      formatSubscriptionPriceLabel({ monthlyPrice: 29, yearlyPrice: 290, billingInterval: "yearly" }),
      "$290.00/year",
    );
    assert.equal(formatSubscriptionPriceLabel({ monthlyPrice: 0, yearlyPrice: 0 }), "Complimentary");
  });

  it("computes calendar days until trial end", () => {
    const now = new Date("2026-06-24T15:00:00Z");
    const trialEnd = new Date("2026-07-01T08:00:00Z");
    assert.equal(calendarDaysUntil(trialEnd, now), 7);
  });
});
