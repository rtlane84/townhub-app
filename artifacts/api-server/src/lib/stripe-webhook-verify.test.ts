import assert from "node:assert/strict";
import { describe, it } from "node:test";
import StripeSdk from "stripe";
import {
  hasAnyStripeWebhookSecret,
  resolveStripeWebhookSecrets,
  verifyStripeWebhookSignature,
} from "./stripe-webhook-verify";

describe("resolveStripeWebhookSecrets", () => {
  it("prefers connect and platform secrets and dedupes identical values", () => {
    const resolved = resolveStripeWebhookSecrets({
      STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect",
      STRIPE_PLATFORM_WEBHOOK_SECRET: "whsec_platform",
      STRIPE_WEBHOOK_SECRET: "whsec_connect",
    } as NodeJS.ProcessEnv);

    assert.deepEqual(resolved, [
      { secret: "whsec_connect", source: "connect" },
      { secret: "whsec_platform", source: "platform" },
    ]);
  });

  it("falls back to legacy STRIPE_WEBHOOK_SECRET", () => {
    const resolved = resolveStripeWebhookSecrets({
      STRIPE_WEBHOOK_SECRET: "whsec_legacy",
    } as NodeJS.ProcessEnv);
    assert.deepEqual(resolved, [{ secret: "whsec_legacy", source: "legacy" }]);
  });

  it("hasAnyStripeWebhookSecret reflects configured secrets", () => {
    assert.equal(hasAnyStripeWebhookSecret({} as NodeJS.ProcessEnv), false);
    assert.equal(
      hasAnyStripeWebhookSecret({
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_x",
      } as NodeJS.ProcessEnv),
      true,
    );
  });
});

describe("verifyStripeWebhookSignature multi-secret", () => {
  const stripeClient = new StripeSdk("sk_test_webhook_unit_test", {
    apiVersion: "2026-05-27.dahlia",
  });

  it("accepts a signature that matches the second configured secret", () => {
    const payload = JSON.stringify({
      id: "evt_test_multi",
      object: "event",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    const secret = "whsec_platform_only_secret_for_test";
    const header = stripeClient.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    const result = verifyStripeWebhookSignature({
      rawBody: Buffer.from(payload),
      signatureHeader: header,
      stripeClient,
      secrets: [
        { secret: "whsec_wrong_connect", source: "connect" },
        { secret, source: "platform" },
      ],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.secretSource, "platform");
      assert.equal(result.event.id, "evt_test_multi");
    }
  });
});
