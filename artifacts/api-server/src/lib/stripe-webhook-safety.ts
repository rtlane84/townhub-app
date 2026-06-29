import type Stripe from "stripe";
import {
  expectedCheckoutAmountCents,
  parseCheckoutSessionOrderId,
  parseCheckoutSessionConnectedAccountId,
} from "./stripe-config";

export type StripeWebhookVerificationResult =
  | { ok: true; event: Stripe.Event }
  | { ok: false; status: number; error: string; reason: string };

export function verifyStripeWebhookSignature(input: {
  rawBody: unknown;
  signatureHeader: string | string[] | undefined;
  webhookSecret: string | undefined;
  stripeClient: Stripe | null;
}): StripeWebhookVerificationResult {
  const sig = input.signatureHeader;
  if (!sig || typeof sig !== "string") {
    return {
      ok: false,
      status: 400,
      error: "Missing Stripe signature",
      reason: "missing_signature",
    };
  }

  const webhookSecret = input.webhookSecret?.trim();
  if (!webhookSecret || !input.stripeClient) {
    return {
      ok: false,
      status: 503,
      error: "Webhook processing not configured",
      reason: "not_configured",
    };
  }

  if (!Buffer.isBuffer(input.rawBody)) {
    return {
      ok: false,
      status: 400,
      error: "Webhook requires raw request body",
      reason: "invalid_body",
    };
  }

  try {
    const event = input.stripeClient.webhooks.constructEvent(
      input.rawBody,
      sig,
      webhookSecret,
    );
    return { ok: true, event };
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Invalid Stripe signature",
      reason: "invalid_signature",
    };
  }
}

export type CheckoutSessionOrderSnapshot = {
  id: number;
  businessId: number;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  stripeSessionId: string | null;
  stripeConnectedAccountId: string | null;
};

export type CheckoutSessionBusinessSnapshot = {
  stripeConnectedAccountId: string | null;
};

export type CheckoutPaymentEvaluation =
  | { action: "reject"; reason: string; orderId?: number }
  | { action: "already_paid"; orderId: number }
  | {
      action: "mark_paid";
      orderId: number;
      connectedAccountId: string;
      sessionId: string;
    };

export function evaluateCheckoutSessionPayment(
  session: Stripe.Checkout.Session,
  eventAccount: string | null | undefined,
  order: CheckoutSessionOrderSnapshot,
  business: CheckoutSessionBusinessSnapshot | null | undefined,
): CheckoutPaymentEvaluation {
  if (session.payment_status !== "paid") {
    return { action: "reject", reason: "session_not_paid" };
  }

  const orderId = parseCheckoutSessionOrderId(session);
  if (!orderId) {
    return { action: "reject", reason: "missing_order_id" };
  }

  const connectedAccountId = parseCheckoutSessionConnectedAccountId(session, eventAccount);
  if (!connectedAccountId) {
    return { action: "reject", reason: "missing_connected_account", orderId };
  }

  if (order.paymentMethod === "IN_PERSON") {
    return { action: "reject", reason: "pay_at_pickup_order", orderId };
  }

  if (!business?.stripeConnectedAccountId) {
    return { action: "reject", reason: "business_not_connected", orderId };
  }

  if (business.stripeConnectedAccountId !== connectedAccountId) {
    return { action: "reject", reason: "connected_account_mismatch", orderId };
  }

  if (order.paymentStatus === "PAID") {
    return { action: "already_paid", orderId };
  }

  if (order.stripeSessionId && order.stripeSessionId !== session.id) {
    return { action: "reject", reason: "session_mismatch", orderId };
  }

  if (order.stripeConnectedAccountId && order.stripeConnectedAccountId !== connectedAccountId) {
    return { action: "reject", reason: "order_account_mismatch", orderId };
  }

  if (session.amount_total != null) {
    const expected = expectedCheckoutAmountCents(order.total);
    if (session.amount_total !== expected) {
      return { action: "reject", reason: "amount_mismatch", orderId };
    }
  }

  return {
    action: "mark_paid",
    orderId,
    connectedAccountId,
    sessionId: session.id,
  };
}
