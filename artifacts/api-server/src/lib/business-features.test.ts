import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEGACY_SUBSCRIPTION_STATUS_ALIASES,
  normalizeSubscriptionStatus,
  subscriptionStatusGrantsFeatures,
  subscriptionGrantsFeaturesForPlan,
  SUBSCRIPTION_FEATURE_KEYS,
} from "./subscription-feature-keys.ts";

describe("subscription feature keys", () => {
  it("defines stable keys for application feature checks", () => {
    assert.equal(SUBSCRIPTION_FEATURE_KEYS.ONLINE_ORDERING, "online_ordering");
    assert.equal(SUBSCRIPTION_FEATURE_KEYS.APPOINTMENT_REQUESTS, "appointment_requests");
    assert.equal(SUBSCRIPTION_FEATURE_KEYS.SMS_NOTIFICATIONS, "sms_notifications");
  });
});

describe("subscription status helpers", () => {
  it("normalizes legacy enum values", () => {
    assert.equal(normalizeSubscriptionStatus("TRIALING"), "TRIAL");
    assert.equal(normalizeSubscriptionStatus("PAUSED"), "SUSPENDED");
    assert.equal(normalizeSubscriptionStatus("ACTIVE"), "ACTIVE");
  });

  it("grants features for entitled statuses only", () => {
    assert.equal(subscriptionStatusGrantsFeatures("ACTIVE"), true);
    assert.equal(subscriptionStatusGrantsFeatures("TRIAL"), true);
    assert.equal(subscriptionStatusGrantsFeatures("BETA"), true);
    assert.equal(subscriptionStatusGrantsFeatures("PAST_DUE"), true);
    assert.equal(subscriptionStatusGrantsFeatures("CANCELED"), false);
    assert.equal(subscriptionStatusGrantsFeatures("SUSPENDED"), false);
    assert.equal(subscriptionStatusGrantsFeatures("INCOMPLETE"), false);
    assert.equal(subscriptionStatusGrantsFeatures("TRIALING"), true);
  });

  it("applies complimentary-plan overrides for restricted statuses", () => {
    assert.equal(subscriptionGrantsFeaturesForPlan("CANCELED", true), true);
    assert.equal(subscriptionGrantsFeaturesForPlan("CANCELED", false), false);
    assert.equal(subscriptionGrantsFeaturesForPlan("INCOMPLETE", false), false);
  });

  it("maps all legacy aliases", () => {
    for (const [legacy, modern] of Object.entries(LEGACY_SUBSCRIPTION_STATUS_ALIASES)) {
      assert.equal(normalizeSubscriptionStatus(legacy), modern);
    }
  });
});

describe("business-features module", () => {
  it("exports the central feature access helpers", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./business-features.ts", import.meta.url), "utf8"),
    );
    assert.match(source, /getBusinessFeatureKeys/);
    assert.match(source, /businessHasFeature/);
    assert.match(source, /mapBusinessesHaveFeature/);
    assert.match(source, /getPlanFeatures/);
    assert.match(source, /setPlanFeatures/);
    assert.match(source, /buildBusinessFeatureAccessReport/);
    assert.match(source, /No subscription row → no features/);
    assert.match(source, /Plan with zero mapped features → no features/);
  });

  it("batches mapBusinessesHaveFeature with a fixed query set instead of N lookups", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./business-features.ts", import.meta.url), "utf8"),
    );
    const mapStart = source.indexOf("export async function mapBusinessesHaveFeature");
    const mapEnd = source.indexOf("export async function businessHasFeature", mapStart);
    assert.ok(mapStart >= 0 && mapEnd > mapStart);
    const mapBody = source.slice(mapStart, mapEnd);

    assert.match(mapBody, /inArray\(businessSubscriptionsTable\.businessId/);
    assert.match(mapBody, /inArray\(subscriptionPlansTable\.id/);
    assert.match(mapBody, /inArray\(planFeaturesTable\.planId/);
    assert.match(mapBody, /subscriptionGrantsFeaturesForPlan/);
    assert.match(mapBody, /isComplimentaryPlan/);
    assert.doesNotMatch(mapBody, /Promise\.all/);
    assert.doesNotMatch(mapBody, /businessHasFeature\(/);
    assert.doesNotMatch(mapBody, /getBusinessFeatureKeys\(/);
  });
});
