import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, ordersTable, businessesTable } from "@workspace/db";
import { logOperationalFailure } from "./operational-log";
import {
  parseCheckoutSessionOrderId,
  parseCheckoutSessionConnectedAccountId,
  type MarkOrderPaidResult,
} from "./stripe-config";
import { handleAccountUpdatedEvent } from "./stripe-connect";
import {
  evaluateCheckoutSessionPayment,
  verifyStripeWebhookSignature,
} from "./stripe-webhook-safety";

export {
  evaluateCheckoutSessionPayment,
  verifyStripeWebhookSignature,
  type CheckoutPaymentEvaluation,
  type CheckoutSessionBusinessSnapshot,
  type CheckoutSessionOrderSnapshot,
  type StripeWebhookVerificationResult,
} from "./stripe-webhook-safety";

function logCheckoutPaymentRejection(reason: string, orderId?: number): void {
  logOperationalFailure("stripe_webhook_failed", { reason, orderId });
}

export async function markOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
  eventAccount?: string | null,
): Promise<MarkOrderPaidResult> {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "session_not_paid" };
  }

  const orderId = parseCheckoutSessionOrderId(session);
  if (!orderId) {
    return { ok: false, reason: "missing_order_id" };
  }

  const connectedAccountId = parseCheckoutSessionConnectedAccountId(session, eventAccount);
  if (!connectedAccountId) {
    return { ok: false, reason: "missing_connected_account", orderId };
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) {
    return { ok: false, reason: "order_not_found", orderId };
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  const evaluation = evaluateCheckoutSessionPayment(session, eventAccount, order, business);

  if (evaluation.action === "reject") {
    logCheckoutPaymentRejection(evaluation.reason, evaluation.orderId);
    return { ok: false, reason: evaluation.reason, orderId: evaluation.orderId };
  }

  if (evaluation.action === "already_paid") {
    return { ok: true, orderId: evaluation.orderId, alreadyPaid: true };
  }

  await db
    .update(ordersTable)
    .set({
      paymentStatus: "PAID",
      stripeSessionId: evaluation.sessionId,
      stripeConnectedAccountId: evaluation.connectedAccountId,
    })
    .where(eq(ordersTable.id, evaluation.orderId));

  return { ok: true, orderId: evaluation.orderId, alreadyPaid: false };
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<{
  handled: boolean;
  result?: MarkOrderPaidResult;
}> {
  if (event.type === "account.updated") {
    await handleAccountUpdatedEvent(event.data.object as Stripe.Account);
    return { handled: true };
  }

  if (event.type !== "checkout.session.completed") {
    return { handled: false };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const result = await markOrderPaidFromCheckoutSession(session, event.account);
  return { handled: true, result };
}
