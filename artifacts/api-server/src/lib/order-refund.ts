import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderRefundsTable,
  usersTable,
  type Order,
  type OrderRefund,
} from "@workspace/db";
import { stripe } from "./stripe";
import { logOperationalFailure } from "./operational-log";
import { authorizeOrderStatusUpdate, type UserRole } from "./order-access";
import { isPostgresUniqueViolation } from "./business-slug";
import {
  computeAggregateRefundStatus,
  evaluateRefundEligibility,
  mapStripeRefundStatus,
  orderTotalCents,
  parsePaymentIntentId,
  validateRefundAmount,
  type OrderRefundRecordStatus,
  type RefundStatus,
} from "./order-refund-logic";
import { publishOrderRefundedLiveEvent } from "./business-live-events";

export {
  computeAggregateRefundStatus,
  evaluateRefundEligibility,
  mapStripeRefundStatus,
  orderTotalCents,
  validateRefundAmount,
  type RefundStatus,
  type OrderRefundRecordStatus,
  type RefundEligibilityResult,
} from "./order-refund-logic";

export type RefundAuthResult =
  | { allowed: true; userRole: UserRole }
  | { allowed: false; statusCode: number; error: string };

export type SerializedOrderRefund = {
  id: number;
  amountCents: number;
  reason: string | null;
  status: OrderRefundRecordStatus;
  stripeRefundId: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
};

export function authorizeOrderRefund(input: {
  userId: string;
  userRole: UserRole | null | undefined;
  businessOwnerId: string | null | undefined;
}): RefundAuthResult {
  const auth = authorizeOrderStatusUpdate({
    userId: input.userId,
    userRole: input.userRole,
    businessOwnerId: input.businessOwnerId,
  });

  if (!auth.allowed) {
    return { allowed: false, statusCode: auth.statusCode, error: auth.error };
  }

  return { allowed: true, userRole: input.userRole! };
}

export async function resolvePaymentIntentId(
  order: Pick<Order, "stripeSessionId" | "stripeConnectedAccountId" | "stripePaymentIntentId">,
): Promise<string | null> {
  if (order.stripePaymentIntentId) {
    return order.stripePaymentIntentId;
  }

  if (!order.stripeSessionId || !order.stripeConnectedAccountId || !stripe) {
    return null;
  }

  const session = await stripe.checkout.sessions.retrieve(
    order.stripeSessionId,
    { expand: ["payment_intent"] },
    { stripeAccount: order.stripeConnectedAccountId },
  );

  return parsePaymentIntentId(session.payment_intent);
}

export async function loadOrderRefunds(orderId: number): Promise<OrderRefund[]> {
  return db
    .select()
    .from(orderRefundsTable)
    .where(eq(orderRefundsTable.orderId, orderId))
    .orderBy(orderRefundsTable.createdAt);
}

export async function serializeOrderRefunds(
  refunds: OrderRefund[],
): Promise<SerializedOrderRefund[]> {
  if (refunds.length === 0) return [];

  const userIds = [...new Set(refunds.map((refund) => refund.createdByUserId))];
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(inArray(usersTable.id, userIds));
  const userById = new Map(users.map((user) => [user.id, user]));

  return refunds.map((refund) => {
    const user = userById.get(refund.createdByUserId);
    return {
      id: refund.id,
      amountCents: refund.amountCents,
      reason: refund.reason,
      status: refund.status,
      stripeRefundId: refund.stripeRefundId,
      createdByUserId: refund.createdByUserId,
      createdByName: user?.name ?? user?.email ?? null,
      createdAt:
        refund.createdAt instanceof Date
          ? refund.createdAt.toISOString()
          : String(refund.createdAt),
    };
  });
}

async function hasPendingRefund(orderId: number): Promise<boolean> {
  const [pending] = await db
    .select({ id: orderRefundsTable.id })
    .from(orderRefundsTable)
    .where(
      and(
        eq(orderRefundsTable.orderId, orderId),
        eq(orderRefundsTable.status, "PENDING"),
      ),
    )
    .limit(1);

  return !!pending;
}

async function syncOrderRefundAggregates(orderId: number): Promise<void> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return;

  const refunds = await loadOrderRefunds(orderId);
  const succeededCents = refunds
    .filter((refund) => refund.status === "SUCCEEDED")
    .reduce((sum, refund) => sum + refund.amountCents, 0);
  const hasFailedAttempt = refunds.some((refund) => refund.status === "FAILED");
  const totalCents = orderTotalCents(order);
  const refundStatus = computeAggregateRefundStatus(totalCents, succeededCents, hasFailedAttempt);
  const lastSucceeded = [...refunds]
    .reverse()
    .find((refund) => refund.status === "SUCCEEDED");

  await db
    .update(ordersTable)
    .set({
      refundedAmountCents: succeededCents,
      refundStatus,
      lastRefundedAt: lastSucceeded?.createdAt ?? order.lastRefundedAt,
    })
    .where(eq(ordersTable.id, orderId));
}

export type CreateOrderRefundResult =
  | { ok: true; refund: OrderRefund; order: Order }
  | { ok: false; statusCode: number; error: string };

export async function createOrderRefund(input: {
  orderId: number;
  amountCents: number;
  reason: string;
  createdByUserId: string;
}): Promise<CreateOrderRefundResult> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, input.orderId));
  if (!order) {
    return { ok: false, statusCode: 404, error: "Order not found" };
  }

  const eligibility = evaluateRefundEligibility(order);
  if (!eligibility.eligible) {
    return { ok: false, statusCode: eligibility.statusCode, error: eligibility.error };
  }

  const amountValidation = validateRefundAmount(input.amountCents, eligibility.remainingCents);
  if (!amountValidation.ok) {
    return { ok: false, statusCode: amountValidation.statusCode, error: amountValidation.error };
  }

  if (await hasPendingRefund(order.id)) {
    return {
      ok: false,
      statusCode: 409,
      error: "A refund is already in progress for this order.",
    };
  }

  const paymentIntentId =
    order.stripePaymentIntentId ?? (await resolvePaymentIntentId(order));
  if (!paymentIntentId) {
    return {
      ok: false,
      statusCode: 400,
      error: "Unable to resolve Stripe payment for this order.",
    };
  }

  const idempotencyKey = `order-refund-${order.id}-${randomUUID()}`;
  let refundRecord: typeof orderRefundsTable.$inferSelect;
  try {
    [refundRecord] = await db
      .insert(orderRefundsTable)
      .values({
        orderId: order.id,
        businessId: order.businessId,
        amountCents: input.amountCents,
        reason: input.reason.trim() || null,
        idempotencyKey,
        status: "PENDING",
        createdByUserId: input.createdByUserId,
      })
      .returning();
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      return {
        ok: false,
        statusCode: 409,
        error: "A refund is already in progress for this order.",
      };
    }
    throw err;
  }

  if (!stripe) {
    await db
      .update(orderRefundsTable)
      .set({ status: "FAILED" })
      .where(eq(orderRefundsTable.id, refundRecord.id));
    await syncOrderRefundAggregates(order.id);
    return {
      ok: false,
      statusCode: 503,
      error: "Stripe is not configured for refunds.",
    };
  }

  try {
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: input.amountCents,
        metadata: {
          orderId: String(order.id),
          orderNumber: order.orderNumber,
          refundRecordId: String(refundRecord.id),
        },
      },
      {
        stripeAccount: eligibility.connectedAccountId,
        idempotencyKey,
      },
    );

    const stripeStatus = mapStripeRefundStatus(stripeRefund.status);
    await db
      .update(orderRefundsTable)
      .set({
        stripeRefundId: stripeRefund.id,
        status: stripeStatus,
      })
      .where(eq(orderRefundsTable.id, refundRecord.id));

    if (!order.stripePaymentIntentId) {
      await db
        .update(ordersTable)
        .set({ stripePaymentIntentId: paymentIntentId })
        .where(eq(ordersTable.id, order.id));
    }

    await syncOrderRefundAggregates(order.id);

    const [updatedRefund] = await db
      .select()
      .from(orderRefundsTable)
      .where(eq(orderRefundsTable.id, refundRecord.id));
    const [updatedOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id));

    if (stripeStatus === "FAILED") {
      return {
        ok: false,
        statusCode: 502,
        error: "Stripe failed to process the refund.",
      };
    }

    return {
      ok: true,
      refund: updatedRefund!,
      order: updatedOrder!,
    };
  } catch (err) {
    logOperationalFailure("order_refund_failed", {
      orderId: order.id,
      refundRecordId: refundRecord.id,
      error: err instanceof Error ? err.message : String(err),
    });

    await db
      .update(orderRefundsTable)
      .set({ status: "FAILED" })
      .where(eq(orderRefundsTable.id, refundRecord.id));
    await syncOrderRefundAggregates(order.id);

    return {
      ok: false,
      statusCode: 502,
      error: "Stripe failed to process the refund.",
    };
  }
}

export async function syncRefundFromStripe(input: {
  stripeRefundId: string;
  status: OrderRefundRecordStatus;
  amountCents?: number;
  /** Optional Stripe refund metadata.refundRecordId for race before stripeRefundId is stored. */
  refundRecordId?: number | null;
  reason?: string | null;
}): Promise<{ updated: boolean; orderId?: number; becameSucceeded?: boolean }> {
  let refundRecord: OrderRefund | undefined;

  const [byStripeId] = await db
    .select()
    .from(orderRefundsTable)
    .where(eq(orderRefundsTable.stripeRefundId, input.stripeRefundId));
  refundRecord = byStripeId;

  if (!refundRecord && input.refundRecordId != null) {
    const [byLocalId] = await db
      .select()
      .from(orderRefundsTable)
      .where(eq(orderRefundsTable.id, input.refundRecordId));
    refundRecord = byLocalId;
  }

  if (!refundRecord) {
    return { updated: false };
  }

  const previousStatus = refundRecord.status;
  if (
    previousStatus === input.status &&
    refundRecord.stripeRefundId === input.stripeRefundId &&
    (input.amountCents == null || refundRecord.amountCents === input.amountCents)
  ) {
    return { updated: false, orderId: refundRecord.orderId };
  }

  await db
    .update(orderRefundsTable)
    .set({
      status: input.status,
      stripeRefundId: input.stripeRefundId,
      ...(input.amountCents != null ? { amountCents: input.amountCents } : {}),
      ...(input.reason != null ? { reason: input.reason } : {}),
    })
    .where(eq(orderRefundsTable.id, refundRecord.id));

  await syncOrderRefundAggregates(refundRecord.orderId);

  const becameSucceeded =
    input.status === "SUCCEEDED" && previousStatus !== "SUCCEEDED";

  if (becameSucceeded) {
    const amountCents = input.amountCents ?? refundRecord.amountCents;
    const [order] = await db
      .select({ businessId: ordersTable.businessId })
      .from(ordersTable)
      .where(eq(ordersTable.id, refundRecord.orderId));
    if (order) {
      publishOrderRefundedLiveEvent(order.businessId, refundRecord.orderId, "REFUNDED");
    }
    void import("./notification-service")
      .then(({ notifyCustomerOrderRefund }) =>
        notifyCustomerOrderRefund(refundRecord!.orderId, amountCents),
      )
      .catch(() => {});
  }

  return { updated: true, orderId: refundRecord.orderId, becameSucceeded };
}

export function extractPaymentIntentIdFromStripeObject(
  paymentIntent: string | { id: string } | null | undefined,
): string | null {
  return parsePaymentIntentId(paymentIntent);
}

export async function persistPaymentIntentFromCheckoutSession(
  orderId: number,
  paymentIntentId: string,
): Promise<void> {
  await db
    .update(ordersTable)
    .set({ stripePaymentIntentId: paymentIntentId })
    .where(eq(ordersTable.id, orderId));
}
