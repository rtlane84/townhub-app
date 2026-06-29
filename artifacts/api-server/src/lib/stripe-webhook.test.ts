import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import StripeSdk from "stripe";
import {
  evaluateCheckoutSessionPayment,
  verifyStripeWebhookSignature,
  type CheckoutSessionBusinessSnapshot,
  type CheckoutSessionOrderSnapshot,
} from "./stripe-webhook-safety";

const CONNECTED_ACCOUNT = "acct_test_connected";
const SESSION_ID = "cs_test_session_123";

function orderSnapshot(overrides: Partial<CheckoutSessionOrderSnapshot> = {}): CheckoutSessionOrderSnapshot {
  return {
    id: 1,
    businessId: 10,
    total: "12.50",
    paymentStatus: "PENDING",
    paymentMethod: "STRIPE",
    stripeSessionId: SESSION_ID,
    stripeConnectedAccountId: CONNECTED_ACCOUNT,
    ...overrides,
  };
}

function businessSnapshot(
  overrides: Partial<CheckoutSessionBusinessSnapshot> = {},
): CheckoutSessionBusinessSnapshot {
  return {
    stripeConnectedAccountId: CONNECTED_ACCOUNT,
    ...overrides,
  };
}

function paidSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    payment_status: "paid",
    amount_total: 1250,
    metadata: {
      orderId: "1",
      connectedAccountId: CONNECTED_ACCOUNT,
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("evaluateCheckoutSessionPayment", () => {
  it("accepts a valid checkout.session.completed payment for marking PAID", () => {
    const evaluation = evaluateCheckoutSessionPayment(
      paidSession(),
      CONNECTED_ACCOUNT,
      orderSnapshot(),
      businessSnapshot(),
    );

    assert.deepEqual(evaluation, {
      action: "mark_paid",
      orderId: 1,
      connectedAccountId: CONNECTED_ACCOUNT,
      sessionId: SESSION_ID,
    });
  });

  it("is idempotent for duplicate checkout.session.completed deliveries", () => {
    const session = paidSession();
    const order = orderSnapshot();
    const business = businessSnapshot();

    const first = evaluateCheckoutSessionPayment(session, CONNECTED_ACCOUNT, order, business);
    assert.equal(first.action, "mark_paid");

    const second = evaluateCheckoutSessionPayment(
      session,
      CONNECTED_ACCOUNT,
      orderSnapshot({ paymentStatus: "PAID" }),
      business,
    );
    assert.deepEqual(second, { action: "already_paid", orderId: 1 });
  });

  it("rejects pay-at-pickup IN_PERSON orders", () => {
    const evaluation = evaluateCheckoutSessionPayment(
      paidSession(),
      CONNECTED_ACCOUNT,
      orderSnapshot({ paymentMethod: "IN_PERSON" }),
      businessSnapshot(),
    );

    assert.deepEqual(evaluation, {
      action: "reject",
      reason: "pay_at_pickup_order",
      orderId: 1,
    });
  });

  it("rejects session mismatch safely", () => {
    const evaluation = evaluateCheckoutSessionPayment(
      paidSession({ id: "cs_different_session" }),
      CONNECTED_ACCOUNT,
      orderSnapshot({ stripeSessionId: "cs_original_session" }),
      businessSnapshot(),
    );

    assert.deepEqual(evaluation, {
      action: "reject",
      reason: "session_mismatch",
      orderId: 1,
    });
  });

  it("rejects connected account mismatch safely", () => {
    const evaluation = evaluateCheckoutSessionPayment(
      paidSession(),
      "acct_wrong_connected",
      orderSnapshot(),
      businessSnapshot(),
    );

    assert.deepEqual(evaluation, {
      action: "reject",
      reason: "connected_account_mismatch",
      orderId: 1,
    });
  });

  it("rejects amount mismatch safely", () => {
    const evaluation = evaluateCheckoutSessionPayment(
      paidSession({ amount_total: 999 }),
      CONNECTED_ACCOUNT,
      orderSnapshot({ total: "12.50" }),
      businessSnapshot(),
    );

    assert.deepEqual(evaluation, {
      action: "reject",
      reason: "amount_mismatch",
      orderId: 1,
    });
  });
});

describe("verifyStripeWebhookSignature", () => {
  const stripeClient = new StripeSdk("sk_test_webhook_unit_test", {
    apiVersion: "2026-05-27.dahlia",
  });

  it("returns 400 for missing signature", () => {
    const result = verifyStripeWebhookSignature({
      rawBody: Buffer.from('{"id":"evt_test"}'),
      signatureHeader: undefined,
      webhookSecret: "whsec_test",
      stripeClient,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.error, "Missing Stripe signature");
      assert.equal(result.reason, "missing_signature");
    }
  });

  it("returns 400 for invalid or forged signatures", () => {
    const result = verifyStripeWebhookSignature({
      rawBody: Buffer.from('{"id":"evt_test","type":"checkout.session.completed"}'),
      signatureHeader: "t=123,v1=forged_signature",
      webhookSecret: "whsec_test_secret",
      stripeClient,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.error, "Invalid Stripe signature");
      assert.equal(result.reason, "invalid_signature");
    }
  });

  it("returns 400 when webhook body is not raw", () => {
    const result = verifyStripeWebhookSignature({
      rawBody: { parsed: true },
      signatureHeader: "t=123,v1=abc",
      webhookSecret: "whsec_test",
      stripeClient,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.error, "Webhook requires raw request body");
      assert.equal(result.reason, "invalid_body");
    }
  });
});
