import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, ordersTable, businessesTable } from "@workspace/db";
import { logOperationalFailure } from "./operational-log";
import {
  expectedCheckoutAmountCents,
  parseCheckoutSessionOrderId,
  parseCheckoutSessionConnectedAccountId,
  type MarkOrderPaidResult,
} from "./stripe-config";
import { handleAccountUpdatedEvent } from "./stripe-connect";

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

  if (order.paymentMethod === "IN_PERSON") {
    logOperationalFailure("stripe_webhook_failed", {
      reason: "pay_at_pickup_order",
      orderId,
    });
    return { ok: false, reason: "pay_at_pickup_order", orderId };
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  if (!business?.stripeConnectedAccountId) {
    logOperationalFailure("stripe_webhook_failed", {
      reason: "business_not_connected",
      orderId,
    });
    return { ok: false, reason: "business_not_connected", orderId };
  }

  if (business.stripeConnectedAccountId !== connectedAccountId) {
    logOperationalFailure("stripe_webhook_failed", {
      reason: "connected_account_mismatch",
      orderId,
    });
    return { ok: false, reason: "connected_account_mismatch", orderId };
  }

  if (order.paymentStatus === "PAID") {
    return { ok: true, orderId, alreadyPaid: true };
  }

  if (order.stripeSessionId && order.stripeSessionId !== session.id) {
    logOperationalFailure("stripe_webhook_failed", {
      reason: "session_mismatch",
      orderId,
    });
    return { ok: false, reason: "session_mismatch", orderId };
  }

  if (order.stripeConnectedAccountId && order.stripeConnectedAccountId !== connectedAccountId) {
    logOperationalFailure("stripe_webhook_failed", {
      reason: "order_account_mismatch",
      orderId,
    });
    return { ok: false, reason: "order_account_mismatch", orderId };
  }

  if (session.amount_total != null) {
    const expected = expectedCheckoutAmountCents(order.total);
    if (session.amount_total !== expected) {
      logOperationalFailure("stripe_webhook_failed", {
        reason: "amount_mismatch",
        orderId,
      });
      return { ok: false, reason: "amount_mismatch", orderId };
    }
  }

  await db
    .update(ordersTable)
    .set({
      paymentStatus: "PAID",
      stripeSessionId: session.id,
      stripeConnectedAccountId: connectedAccountId,
    })
    .where(eq(ordersTable.id, orderId));

  return { ok: true, orderId, alreadyPaid: false };
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
