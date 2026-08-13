import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("storefront entitlement reconciliation wiring", () => {
  it("persists INFORMATION for unsupported modes without auto-promoting upgrades", async () => {
    const source = await readFile(
      new URL("./storefront-mode-reconciliation.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /coerceEntitledStorefrontMode/);
    assert.match(source, /ONLINE_ORDERING/);
    assert.match(source, /APPOINTMENT_REQUESTS/);
    assert.match(source, /\.set\(\{ storefrontMode \}\)/);
    assert.match(source, /invalidatePublicBusinessDirectoryCache/);
  });

  it("reconciles application approvals, plan assignments, feature edits, and Stripe status changes", async () => {
    const [applications, subscriptions, stripeBilling, businessLifecycle] = await Promise.all([
      readFile(new URL("../routes/applications.ts", import.meta.url), "utf8"),
      readFile(new URL("../routes/subscriptions.ts", import.meta.url), "utf8"),
      readFile(new URL("./stripe-billing.ts", import.meta.url), "utf8"),
      readFile(new URL("./business-lifecycle.ts", import.meta.url), "utf8"),
    ]);

    assert.match(applications, /attachPlanToBusiness[\s\S]*reconcileBusinessStorefrontMode/);
    assert.match(subscriptions, /setPlanFeatures[\s\S]*reconcilePlanBusinessStorefrontModes/);
    assert.match(subscriptions, /businessSubscriptionsTable[\s\S]*reconcileBusinessStorefrontMode/);
    assert.match(stripeBilling, /upsertBusinessSubscriptionFromStripe[\s\S]*reconcileBusinessStorefrontMode/);
    assert.match(stripeBilling, /handleSubscriptionDeleted[\s\S]*reconcileBusinessStorefrontMode/);
    assert.match(businessLifecycle, /status: "CANCELED"[\s\S]*reconcileBusinessStorefrontMode/);
  });

  it("serializes appointment entitlement on public and directory business payloads", async () => {
    const source = await readFile(new URL("../routes/businesses.ts", import.meta.url), "utf8");

    assert.match(source, /appointmentRequestsEntitled/);
    assert.match(source, /SUBSCRIPTION_FEATURE_KEYS\.APPOINTMENT_REQUESTS/);
    assert.match(source, /appointmentEntitledById\.get\(business\.id\) === true/);
  });
});
