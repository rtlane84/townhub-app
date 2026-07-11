import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  ordersTable,
  orderItemsTable,
  orderItemOptionsTable,
  pendingCheckoutsTable,
  type PendingCheckout,
  type PendingCheckoutItemSnapshot,
} from "@workspace/db";
import { allocateBusinessOrderNumber } from "./business-order-number";
import { isPostgresUniqueViolation } from "./business-slug";
import { extractPaymentIntentIdFromStripeObject } from "./order-refund";
import { parseCheckoutSessionConnectedAccountId } from "./stripe-config";
import { expectedCheckoutAmountCents } from "./stripe-config";

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TH-${dateStr}-${rand}`;
}

export type MaterializePaidOrderResult =
  | { ok: true; orderId: number; alreadyExisted: boolean }
  | { ok: false; reason: string; pendingCheckoutId?: number; orderId?: number };

function parseItemsJson(raw: unknown): PendingCheckoutItemSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw as PendingCheckoutItemSnapshot[];
}

/**
 * Create a PAID order from a pending checkout after Stripe confirms payment.
 * Idempotent on stripe session id / pending.order_id.
 */
export async function materializePaidOrderFromPendingCheckout(input: {
  pending: PendingCheckout;
  session: Stripe.Checkout.Session;
  eventAccount?: string | null;
}): Promise<MaterializePaidOrderResult> {
  const { pending, session, eventAccount } = input;

  if (pending.orderId) {
    return { ok: true, orderId: pending.orderId, alreadyExisted: true };
  }

  if (pending.status === "COMPLETED" && pending.orderId) {
    return { ok: true, orderId: pending.orderId, alreadyExisted: true };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "session_not_paid", pendingCheckoutId: pending.id };
  }

  const connectedAccountId = parseCheckoutSessionConnectedAccountId(session, eventAccount);
  if (!connectedAccountId) {
    return { ok: false, reason: "missing_connected_account", pendingCheckoutId: pending.id };
  }

  if (
    pending.stripeConnectedAccountId &&
    pending.stripeConnectedAccountId !== connectedAccountId
  ) {
    return { ok: false, reason: "connected_account_mismatch", pendingCheckoutId: pending.id };
  }

  if (pending.stripeSessionId && pending.stripeSessionId !== session.id) {
    return { ok: false, reason: "session_mismatch", pendingCheckoutId: pending.id };
  }

  if (session.amount_total != null) {
    const expected = expectedCheckoutAmountCents(String(pending.total));
    if (session.amount_total !== expected) {
      return { ok: false, reason: "amount_mismatch", pendingCheckoutId: pending.id };
    }
  }

  const items = parseItemsJson(pending.itemsJson);
  if (items.length === 0) {
    return { ok: false, reason: "empty_items", pendingCheckoutId: pending.id };
  }

  const paymentIntentId = extractPaymentIntentIdFromStripeObject(session.payment_intent);

  try {
    const orderId = await db.transaction(async (tx) => {
      // Re-read inside transaction for races.
      const [fresh] = await tx
        .select()
        .from(pendingCheckoutsTable)
        .where(eq(pendingCheckoutsTable.id, pending.id));

      if (!fresh) {
        throw new Error("pending_missing");
      }
      if (fresh.orderId) {
        return fresh.orderId;
      }

      const businessOrderNumber = await allocateBusinessOrderNumber(tx, fresh.businessId);
      const [created] = await tx
        .insert(ordersTable)
        .values({
          businessId: fresh.businessId,
          orderNumber: generateOrderNumber(),
          businessOrderNumber,
          status: "NEW",
          fulfillmentType: fresh.fulfillmentType as "PICKUP" | "DELIVERY",
          customerName: fresh.customerName,
          customerEmail: fresh.customerEmail,
          customerPhone: fresh.customerPhone,
          customerUserId: fresh.customerUserId,
          deliveryAddress: fresh.deliveryAddress,
          pickupTime: "ASAP",
          estimatedWindowStart: fresh.estimatedWindowStart,
          estimatedWindowEnd: fresh.estimatedWindowEnd,
          notes: fresh.notes,
          specialFields: fresh.specialFields,
          subtotalCents: fresh.subtotalCents,
          taxCents: fresh.taxCents,
          taxRatePercent: fresh.taxRatePercent,
          taxLabel: fresh.taxLabel,
          total: fresh.total,
          deliveryFee: fresh.deliveryFee,
          paymentStatus: "PAID",
          paymentMethod: "STRIPE",
          stripeSessionId: session.id,
          stripeConnectedAccountId: connectedAccountId,
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
        })
        .returning({ id: ordersTable.id });

      const insertedItems = await tx
        .insert(orderItemsTable)
        .values(
          items.map((item) => ({
            orderId: created.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            subtotal: String(item.subtotal),
          })),
        )
        .returning();

      const optionRows = insertedItems.flatMap((inserted, index) =>
        (items[index]?.options ?? []).map((opt: PendingCheckoutItemSnapshot["options"][number]) => ({
          orderItemId: inserted.id,
          optionId: opt.optionId,
          groupName: opt.groupName,
          optionName: opt.optionName,
          priceAdjustment: String(opt.priceAdjustment),
        })),
      );
      if (optionRows.length > 0) {
        await tx.insert(orderItemOptionsTable).values(optionRows);
      }

      await tx
        .update(pendingCheckoutsTable)
        .set({
          status: "COMPLETED",
          orderId: created.id,
          stripeSessionId: session.id,
          stripeConnectedAccountId: connectedAccountId,
        })
        .where(eq(pendingCheckoutsTable.id, fresh.id));

      return created.id;
    });

    return { ok: true, orderId, alreadyExisted: false };
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      // Another worker materialized first — resolve by session or pending.order_id.
      const [bySession] = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(eq(ordersTable.stripeSessionId, session.id));
      if (bySession) {
        return { ok: true, orderId: bySession.id, alreadyExisted: true };
      }
      const [again] = await db
        .select()
        .from(pendingCheckoutsTable)
        .where(eq(pendingCheckoutsTable.id, pending.id));
      if (again?.orderId) {
        return { ok: true, orderId: again.orderId, alreadyExisted: true };
      }
    }
    throw err;
  }
}

export async function findPendingCheckoutForStripeSession(
  session: Stripe.Checkout.Session,
): Promise<PendingCheckout | null> {
  const fromMeta = session.metadata?.pendingCheckoutId;
  if (fromMeta) {
    const id = parseInt(fromMeta, 10);
    if (Number.isFinite(id) && id > 0) {
      const [row] = await db
        .select()
        .from(pendingCheckoutsTable)
        .where(eq(pendingCheckoutsTable.id, id));
      if (row) return row;
    }
  }

  if (session.id) {
    const [row] = await db
      .select()
      .from(pendingCheckoutsTable)
      .where(eq(pendingCheckoutsTable.stripeSessionId, session.id));
    if (row) return row;
  }

  return null;
}
