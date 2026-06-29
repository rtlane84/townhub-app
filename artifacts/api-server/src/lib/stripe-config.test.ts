import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expectedCheckoutAmountCents,
  getStripeKeyMode,
  parseCheckoutSessionOrderId,
  validateStripeConfig,
} from "./stripe-config";

describe("stripe-config", () => {
  it("getStripeKeyMode detects mock, test, and live keys", () => {
    assert.equal(getStripeKeyMode(undefined), "mock");
    assert.equal(getStripeKeyMode("sk_test_abc"), "test");
    assert.equal(getStripeKeyMode("sk_live_abc"), "live");
    assert.equal(getStripeKeyMode("invalid"), "unknown");
  });

  it("validateStripeConfig requires webhook secret when Stripe is enabled", () => {
    const result = validateStripeConfig({
      secretKey: "sk_live_abc",
      webhookSecret: "",
      nodeEnv: "production",
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.includes("Webhook signing secret")));
  });

  it("validateStripeConfig flags test keys in production", () => {
    const result = validateStripeConfig({
      secretKey: "sk_test_abc",
      webhookSecret: "whsec_abc",
      nodeEnv: "production",
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.includes("test key")));
  });

  it("validateStripeConfig passes with live key and webhook secret", () => {
    const result = validateStripeConfig({
      secretKey: "sk_live_abc",
      webhookSecret: "whsec_abc",
      nodeEnv: "production",
    });
    assert.equal(result.ok, true);
    assert.equal(result.issues.length, 0);
  });
});

describe("parseCheckoutSessionOrderId", () => {
  it("reads orderId from session metadata", () => {
    assert.equal(
      parseCheckoutSessionOrderId({ metadata: { orderId: "42" } } as never),
      42,
    );
  });

  it("returns null for invalid metadata", () => {
    assert.equal(parseCheckoutSessionOrderId({ metadata: {} } as never), null);
    assert.equal(
      parseCheckoutSessionOrderId({ metadata: { orderId: "abc" } } as never),
      null,
    );
  });
});

describe("expectedCheckoutAmountCents", () => {
  it("converts decimal totals to cents", () => {
    assert.equal(expectedCheckoutAmountCents("12.50"), 1250);
    assert.equal(expectedCheckoutAmountCents("10"), 1000);
  });
});
