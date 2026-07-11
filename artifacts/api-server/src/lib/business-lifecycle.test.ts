import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatApplicationBillingInterval,
  hasActivePaidSubscription,
  isBusinessActive,
  resolveApprovalBillingInterval,
  shouldCancelStripeSubscription,
} from "./business-lifecycle-core.ts";
import { planStripePriceId } from "./stripe-billing-core.ts";

describe("business-lifecycle-core", () => {
  it("treats businesses with archivedAt as inactive", () => {
    assert.equal(isBusinessActive({ archivedAt: null }), true);
    assert.equal(isBusinessActive({ archivedAt: new Date() }), false);
    assert.equal(isBusinessActive({}), true);
  });

  it("resolves approval billing interval from body, application, then monthly default", () => {
    assert.equal(resolveApprovalBillingInterval("yearly", "monthly"), "yearly");
    assert.equal(resolveApprovalBillingInterval(undefined, "yearly"), "yearly");
    assert.equal(resolveApprovalBillingInterval(null, null), "monthly");
  });

  it("formats application billing interval labels", () => {
    assert.equal(formatApplicationBillingInterval("monthly"), "Monthly");
    assert.equal(formatApplicationBillingInterval("yearly"), "Yearly");
    assert.equal(formatApplicationBillingInterval(null), null);
  });

  it("detects active paid subscription statuses", () => {
    assert.equal(hasActivePaidSubscription("ACTIVE"), true);
    assert.equal(hasActivePaidSubscription("TRIAL"), true);
    assert.equal(hasActivePaidSubscription("INCOMPLETE"), false);
    assert.equal(hasActivePaidSubscription("CANCELED"), false);
  });

  it("requires Stripe cancel when a real subscription id exists and is not canceled", () => {
    assert.equal(shouldCancelStripeSubscription("ACTIVE", "sub_123"), true);
    assert.equal(shouldCancelStripeSubscription("INCOMPLETE", "sub_123"), true);
    assert.equal(shouldCancelStripeSubscription("CANCELED", "sub_123"), false);
    assert.equal(shouldCancelStripeSubscription("ACTIVE", "sub_mock_1"), false);
    assert.equal(shouldCancelStripeSubscription("ACTIVE", null), false);
  });
});

describe("approval checkout price selection", () => {
  const plan = {
    stripeMonthlyPriceId: "price_monthly",
    stripeYearlyPriceId: "price_yearly",
  };

  it("uses monthly price id for monthly billing", () => {
    assert.equal(planStripePriceId(plan, "monthly"), "price_monthly");
  });

  it("uses yearly price id for yearly billing", () => {
    assert.equal(planStripePriceId(plan, "yearly"), "price_yearly");
  });
});
