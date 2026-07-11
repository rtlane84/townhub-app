import { eq, and, ne } from "drizzle-orm";
import type Stripe from "stripe";
import { db, ordersTable, businessesTable } from "@workspace/db";
import { logOperationalFailure } from "./operational-log";
import {
  parseCheckoutSessionOrderId,
  parseCheckoutSessionConnectedAccountId,
  type MarkOrderPaidResult,
} from "./stripe-config";
import { handleAccountUpdatedEvent } from "./stripe-connect";
import { notifyCustomerOrderReceived, notifyOwnerNewOrderFromOrderId } from "./notification-service";
import {
  publishOrderCreatedLiveEvent,
  publishOrderPaidLiveEvent,
} from "./business-live-events";
import { claimStripeWebhookEvent } from "./stripe-webhook-dedup";
import {
  evaluateCheckoutSessionPayment,
  verifyStripeWebhookSignature,
} from "./stripe-webhook-safety";
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionCheckoutCompleted,
  isSubscriptionCheckoutSession,
  syncBusinessSubscriptionFromStripeSubscription,
} from "./stripe-billing";
import {
  extractPaymentIntentIdFromStripeObject,
  mapStripeRefundStatus,
  persistPaymentIntentFromCheckoutSession,
  syncRefundFromStripe,
} from "./order-refund";
import {
  findPendingCheckoutForStripeSession,
  materializePaidOrderFromPendingCheckout,
} from "./pending-checkout-materialize";

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

/**
 * Preferred path: materialize a PAID order from pending_checkouts after Stripe pays.
 * Legacy path: mark an existing order PAID (orders created before this refactor).
 */
export async function markOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
  eventAccount?: string | null,
): Promise<MarkOrderPaidResult> {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "session_not_paid" };
  }

  const pending = await findPendingCheckoutForStripeSession(session);
  if (pending) {
    const materialized = await materializePaidOrderFromPendingCheckout({
      pending,
      session,
      eventAccount,
    });
    if (!materialized.ok) {
      logCheckoutPaymentRejection(materialized.reason, materialized.orderId);
      return {
        ok: false,
        reason: materialized.reason,
        orderId: materialized.orderId,
      };
    }

    if (!materialized.alreadyExisted) {
      const [order] = await db
        .select({ businessId: ordersTable.businessId, status: ordersTable.status })
        .from(ordersTable)
        .where(eq(ordersTable.id, materialized.orderId));

      notifyOwnerNewOrderFromOrderId(materialized.orderId).catch(() => {});
      if (order) {
        publishOrderCreatedLiveEvent(
          order.businessId,
          materialized.orderId,
          order.status ?? "NEW",
        );
      }
      notifyCustomerOrderReceived(materialized.orderId).catch(() => {});
      if (order) {
        publishOrderPaidLiveEvent(order.businessId, materialized.orderId);
      }
    }

    return {
      ok: true,
      orderId: materialized.orderId,
      alreadyPaid: materialized.alreadyExisted,
    };
  }

  // Legacy: order was created before payment (pre-refactor sessions still in flight).
  return markLegacyOrderPaidFromCheckoutSession(session, eventAccount);
}

async function markLegacyOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
  eventAccount?: string | null,
): Promise<MarkOrderPaidResult> {
  const orderId = parseCheckoutSessionOrderId(session);
  if (!orderId) {
    return { ok: false, reason: "missing_order_id" };
  }

  const connectedAccountId = parseCheckoutSessionConnectedAccountId(session, eventAccount);
  if (!connectedAccountId) {
    return { ok: false, reason: "missing_connected_account", orderId };
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

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
    const paymentIntentId = extractPaymentIntentIdFromStripeObject(session.payment_intent);
    if (paymentIntentId) {
      await persistPaymentIntentFromCheckoutSession(evaluation.orderId, paymentIntentId);
    }
    return { ok: true, orderId: evaluation.orderId, alreadyPaid: true };
  }

  const paymentIntentId = extractPaymentIntentIdFromStripeObject(session.payment_intent);

  const [updated] = await db
    .update(ordersTable)
    .set({
      paymentStatus: "PAID",
      stripeSessionId: evaluation.sessionId,
      stripeConnectedAccountId: evaluation.connectedAccountId,
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    })
    .where(
      and(eq(ordersTable.id, evaluation.orderId), ne(ordersTable.paymentStatus, "PAID")),
    )
    .returning({ id: ordersTable.id });

  if (!updated) {
    if (paymentIntentId) {
      await persistPaymentIntentFromCheckoutSession(evaluation.orderId, paymentIntentId);
    }
    return { ok: true, orderId: evaluation.orderId, alreadyPaid: true };
  }

  notifyOwnerNewOrderFromOrderId(evaluation.orderId).catch(() => {});
  publishOrderCreatedLiveEvent(order.businessId, evaluation.orderId, order.status ?? "NEW");
  notifyCustomerOrderReceived(evaluation.orderId).catch(() => {});
  publishOrderPaidLiveEvent(order.businessId, evaluation.orderId);

  return { ok: true, orderId: evaluation.orderId, alreadyPaid: false };
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<{
  handled: boolean;
  kind?: "order" | "subscription" | "connect";
  result?: MarkOrderPaidResult;
  duplicate?: boolean;
}> {
  const isNew = await claimStripeWebhookEvent(event.id);
  if (!isNew) {
    return { handled: true, duplicate: true };
  }

  if (event.type === "account.updated") {
    await handleAccountUpdatedEvent(event.data.object as Stripe.Account);
    return { handled: true, kind: "connect" };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (isSubscriptionCheckoutSession(session)) {
      await handleSubscriptionCheckoutCompleted(session);
      return { handled: true, kind: "subscription" };
    }

    const hasPending = Boolean(session.metadata?.pendingCheckoutId);
    const hasOrder = Boolean(parseCheckoutSessionOrderId(session));
    if (!hasPending && !hasOrder) {
      return { handled: false };
    }

    const result = await markOrderPaidFromCheckoutSession(session, event.account);
    return { handled: true, kind: "order", result };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncBusinessSubscriptionFromStripeSubscription(
      event.data.object as Stripe.Subscription,
      event.type,
    );
    return { handled: true, kind: "subscription" };
  }

  if (event.type === "invoice.paid") {
    await handleInvoicePaid(event.data.object as Stripe.Invoice);
    return { handled: true, kind: "subscription" };
  }

  if (event.type === "invoice.payment_failed") {
    await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
    return { handled: true, kind: "subscription" };
  }

  if (
    event.type === "refund.created" ||
    event.type === "refund.updated" ||
    event.type === "refund.failed" ||
    event.type === "charge.refunded" ||
    event.type === "charge.refund.updated"
  ) {
    const handled = await handleOrderRefundWebhookEvent(event);
    return { handled, kind: handled ? "order" : undefined };
  }

  return { handled: false };
}

function parseRefundRecordIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
): number | null {
  const raw = metadata?.refundRecordId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function handleOrderRefundWebhookEvent(event: Stripe.Event): Promise<boolean> {
  if (
    event.type === "refund.created" ||
    event.type === "refund.updated" ||
    event.type === "refund.failed"
  ) {
    const refund = event.data.object as Stripe.Refund;
    const status =
      event.type === "refund.failed"
        ? ("FAILED" as const)
        : mapStripeRefundStatus(refund.status);
    const result = await syncRefundFromStripe({
      stripeRefundId: refund.id,
      status,
      amountCents: refund.amount ?? undefined,
      refundRecordId: parseRefundRecordIdFromMetadata(refund.metadata),
      reason: refund.reason ?? refund.metadata?.reason ?? null,
    });
    return result.updated;
  }

  if (event.type === "charge.refunded" || event.type === "charge.refund.updated") {
    const charge = event.data.object as Stripe.Charge;
    const refunds = charge.refunds?.data ?? [];
    let updated = false;

    for (const refund of refunds) {
      const result = await syncRefundFromStripe({
        stripeRefundId: refund.id,
        status: mapStripeRefundStatus(refund.status),
        amountCents: refund.amount ?? undefined,
        refundRecordId: parseRefundRecordIdFromMetadata(refund.metadata),
        reason: refund.reason ?? refund.metadata?.reason ?? null,
      });
      updated = updated || result.updated;
    }

    return updated;
  }

  return false;
}
