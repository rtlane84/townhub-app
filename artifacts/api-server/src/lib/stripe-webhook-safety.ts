import type Stripe from "stripe";
import {
  expectedCheckoutAmountCents,
  parseCheckoutSessionOrderId,
  parseCheckoutSessionConnectedAccountId,
} from "./stripe-config";

export {
  verifyStripeWebhookSignature,
  resolveStripeWebhookSecrets,
  hasAnyStripeWebhookSecret,
  type StripeWebhookVerificationResult,
  type StripeWebhookSecretSource,
  type ResolvedStripeWebhookSecret,
} from "./stripe-webhook-verify";

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
