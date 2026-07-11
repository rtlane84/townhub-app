import { eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable } from "@workspace/db";
import { resolveOrderTotalsDisplay } from "@workspace/api-zod";
import { buildOwnerNewOrderEmail, buildOwnerRefundFailedEmail } from "./email-templates/business-emails";
import { buildCustomerLifecycleEmail, buildCustomerOrderRefundEmail } from "./email-templates/customer-emails";
import {
  statusToCustomerEvent,
  type CustomerLifecycleEvent,
  type OrderNotificationData,
} from "./email-templates/types";
import {
  buildCustomerLifecycleSms,
  buildOwnerNewOrderSms,
} from "./notification-sms";
import {
  deliverCustomerNotification,
  deliverOwnerEmail,
  deliverOwnerSms,
  deliverOwnerDiscord,
  deliverOwnerNtfy,
  type CustomerLifecycleEventType,
} from "./notification-delivery";
import { deliverPushToUsers } from "./push-delivery";
import {
  buildCustomerOrderPush,
  buildOwnerNewOrderPush,
} from "./notification-push-copy";
import {
  buildOwnerNewOrderDiscordPayload,
  sendOwnerDiscordWebhook,
} from "./discord-owner-notifications";
import { normalizeDiscordWebhookUrl } from "./discord-webhook";
import {
  buildOwnerNewOrderNtfyMessage,
  sendOwnerNtfyNotification,
} from "./ntfy-owner-notifications";
import { isValidNtfyTopic } from "./ntfy-topic";

export {
  statusToCustomerEvent,
  CUSTOMER_NOTIFIABLE_STATUSES,
  type CustomerLifecycleEvent,
  type OrderNotificationData,
} from "./email-templates/types";

export async function loadOrderNotificationData(orderId: number): Promise<OrderNotificationData | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  const mappedItems = items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: parseFloat(item.unitPrice),
    subtotal: parseFloat(item.subtotal),
  }));
  const deliveryFee = order.deliveryFee ? parseFloat(order.deliveryFee) : null;
  const totals = resolveOrderTotalsDisplay({
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    taxLabel: order.taxLabel,
    deliveryFee,
    total: parseFloat(order.total),
    items: mappedItems,
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    businessOrderNumber: order.businessOrderNumber ?? null,
    businessId: order.businessId,
    businessName: business?.name ?? "Local business",
    businessLogoUrl: business?.logoUrl,
    businessAddress: business?.address,
    pickupInstructions: business?.pickupInstructions,
    customerName: order.customerName,
    customerUserId: order.customerUserId,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod ?? "STRIPE",
    paymentStatus: order.paymentStatus ?? "PENDING",
    subtotal: totals.subtotal,
    tax: totals.tax,
    taxLabel: totals.taxLabel,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    items: mappedItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    orderedAt: order.createdAt ?? new Date(),
    notes: order.notes,
    estimatedWindowStart: order.estimatedWindowStart,
    estimatedWindowEnd: order.estimatedWindowEnd,
  };
}

function lifecycleEventType(event: CustomerLifecycleEvent): CustomerLifecycleEventType {
  return event;
}

export async function notifyCustomerLifecycleEvent(
  event: CustomerLifecycleEvent,
  orderId: number,
): Promise<void> {
  const order = await loadOrderNotificationData(orderId);
  if (!order) return;

  const email = buildCustomerLifecycleEmail(event, order);
  const sms = buildCustomerLifecycleSms(event, order);
  const tasks: Promise<unknown>[] = [];

  if (order.customerEmail?.trim()) {
    tasks.push(
      deliverCustomerNotification({
        businessId: order.businessId,
        orderId: order.orderId,
        eventType: lifecycleEventType(event),
        channel: "EMAIL",
        recipient: order.customerEmail.trim(),
        subject: email.subject,
        body: email.text,
        html: email.html,
      }),
    );
  }

  if (order.customerPhone?.trim()) {
    tasks.push(
      deliverCustomerNotification({
        businessId: order.businessId,
        orderId: order.orderId,
        eventType: lifecycleEventType(event),
        channel: "SMS",
        recipient: order.customerPhone.trim(),
        body: sms,
      }),
    );
  }

  if (order.customerUserId) {
    const push = buildCustomerOrderPush(event, order);
    tasks.push(
      deliverPushToUsers({
        userIds: [order.customerUserId],
        businessId: order.businessId,
        eventType: lifecycleEventType(event),
        title: push.title,
        body: push.body,
        deepLink: push.deepLink,
        orderId: order.orderId,
      }),
    );
  }

  await Promise.all(tasks);
}

/** Send "We received your order" after pay-at-pickup checkout. */
export async function notifyCustomerOrderReceived(orderId: number): Promise<void> {
  await notifyCustomerLifecycleEvent("ORDER_RECEIVED", orderId);
}

/** Send lifecycle notification when business updates order status. */
export async function notifyCustomerOrderStatusChange(
  orderId: number,
  newStatus: string,
): Promise<void> {
  const event = statusToCustomerEvent(newStatus);
  if (!event) return;
  await notifyCustomerLifecycleEvent(event, orderId);
}

export async function notifyOwnerNewOrderFromOrderId(orderId: number): Promise<void> {
  const order = await loadOrderNotificationData(orderId);
  if (!order) return;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  if (!business) return;

  const email = buildOwnerNewOrderEmail(order);
  const sms = buildOwnerNewOrderSms(order);

  const tasks: Promise<unknown>[] = [];

  const ownerEmail =
    business.notificationEmail?.trim() || business.orderNotificationEmail?.trim() || null;
  const ownerPhone = business.notificationPhone?.trim() || null;

  if (business.notifyNewOrdersByEmail !== false && ownerEmail) {
    tasks.push(
      deliverOwnerEmail({
        businessId: business.id,
        eventType: "NEW_ORDER",
        to: ownerEmail,
        subject: email.subject,
        body: email.text,
        html: email.html,
        orderId,
      }),
    );
  }

  if (business.notifyNewOrdersBySms && ownerPhone) {
    tasks.push(
      deliverOwnerSms({
        businessId: business.id,
        eventType: "NEW_ORDER",
        to: ownerPhone,
        body: sms,
        orderId,
      }),
    );
  }

  const discordWebhook = normalizeDiscordWebhookUrl(business.discordWebhookUrl);
  if (business.notifyNewOrdersByDiscord && discordWebhook) {
    const payload = buildOwnerNewOrderDiscordPayload(order);
    tasks.push(
      deliverOwnerDiscord({
        businessId: business.id,
        eventType: "NEW_ORDER",
        webhookUrl: discordWebhook,
        body: payload.embeds[0]?.description ?? "New order",
        orderId,
        send: () => sendOwnerDiscordWebhook({ webhookUrl: discordWebhook, payload }),
      }),
    );
  }

  const ntfyTopic = business.ntfyTopic?.trim();
  if (business.ntfyEnabled && ntfyTopic && isValidNtfyTopic(ntfyTopic)) {
    const ntfy = buildOwnerNewOrderNtfyMessage(order);
    tasks.push(
      deliverOwnerNtfy({
        businessId: business.id,
        eventType: "NEW_ORDER",
        topic: ntfyTopic,
        title: ntfy.title,
        body: ntfy.message,
        orderId,
        send: () =>
          sendOwnerNtfyNotification({
            topic: ntfyTopic,
            title: ntfy.title,
            message: ntfy.message,
            click: ntfy.click,
            tags: ntfy.tags,
          }),
      }),
    );
  }

  if (business.ownerId) {
    const push = buildOwnerNewOrderPush(order);
    tasks.push(
      deliverPushToUsers({
        userIds: [business.ownerId],
        businessId: business.id,
        eventType: "NEW_ORDER",
        title: push.title,
        body: push.body,
        deepLink: push.deepLink,
        orderId,
      }),
    );
  }

  await Promise.all(tasks);
}

export async function notifyCustomerOrderRefund(
  orderId: number,
  refundAmountCents: number,
): Promise<void> {
  const order = await loadOrderNotificationData(orderId);
  if (!order || !order.customerEmail?.trim()) return;

  const email = buildCustomerOrderRefundEmail(order, refundAmountCents);
  await deliverCustomerNotification({
    businessId: order.businessId,
    orderId: order.orderId,
    eventType: "ORDER_REFUND",
    channel: "EMAIL",
    recipient: order.customerEmail.trim(),
    subject: email.subject,
    body: email.text,
    html: email.html,
  });
}

export async function notifyOwnerRefundFailed(
  orderId: number,
  refundAmountCents: number,
): Promise<void> {
  const order = await loadOrderNotificationData(orderId);
  if (!order) return;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  if (!business) return;

  const email = buildOwnerRefundFailedEmail(order, refundAmountCents);

  const ownerEmail =
    business.notificationEmail?.trim() || business.orderNotificationEmail?.trim() || null;

  if (!ownerEmail) return;

  await deliverOwnerEmail({
    businessId: business.id,
    eventType: "REFUND_FAILED",
    to: ownerEmail,
    subject: email.subject,
    body: email.text,
    html: email.html,
    orderId,
  });
}
