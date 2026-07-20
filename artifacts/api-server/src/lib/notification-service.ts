import { eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable } from "@workspace/db";
import { resolveOrderTotalsDisplay } from "@workspace/api-zod";
import { buildOwnerNewOrderEmail, buildOwnerRefundFailedEmail, buildOwnerStripeConnectIssueEmail } from "./email-templates/business-emails";
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
  buildOwnerRefundFailedPush,
  buildOwnerStripeConnectIssuePush,
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
import type { StripeConnectIssueDetails } from "./stripe-critical-alerts";
import { businessHasFeature } from "./business-features";
import { SUBSCRIPTION_FEATURE_KEYS } from "./subscription-feature-keys";

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

  const [emailAllowed, smsAllowed] = await Promise.all([
    businessHasFeature(business.id, SUBSCRIPTION_FEATURE_KEYS.EMAIL_NOTIFICATIONS),
    businessHasFeature(business.id, SUBSCRIPTION_FEATURE_KEYS.SMS_NOTIFICATIONS),
  ]);

  if (emailAllowed && business.notifyNewOrdersByEmail !== false && ownerEmail) {
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

  if (smsAllowed && business.notifyNewOrdersBySms && ownerPhone) {
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
  if (
    business.ntfyEnabled &&
    business.notifyNewOrdersByNtfy !== false &&
    ntfyTopic &&
    isValidNtfyTopic(ntfyTopic)
  ) {
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
  const tasks: Promise<unknown>[] = [];

  // Critical: always email when an address exists — ignores operational Email Enable.
  const ownerEmail =
    business.notificationEmail?.trim() || business.orderNotificationEmail?.trim() || null;
  if (ownerEmail) {
    tasks.push(
      deliverOwnerEmail({
        businessId: business.id,
        eventType: "REFUND_FAILED",
        to: ownerEmail,
        subject: email.subject,
        body: email.text,
        html: email.html,
        orderId,
      }),
    );
  }

  // Critical: always push to registered owner devices — ignores category opt-outs.
  if (business.ownerId) {
    const push = buildOwnerRefundFailedPush(order, refundAmountCents);
    tasks.push(
      deliverPushToUsers({
        userIds: [business.ownerId],
        businessId: business.id,
        eventType: "REFUND_FAILED",
        title: push.title,
        body: push.body,
        deepLink: push.deepLink,
        orderId,
        category: "OWNER_STRIPE_ISSUE",
        respectPreferences: false,
      }),
    );
  }

  if (tasks.length) await Promise.all(tasks);
}

/** Critical Stripe Connect / payment account alert (email + mandatory app push). */
export async function notifyOwnerStripeConnectIssue(input: {
  businessId: number;
  businessName: string;
  businessLogoUrl?: string | null;
  ownerId?: string | null;
  notificationEmail?: string | null;
  orderNotificationEmail?: string | null;
  issue: StripeConnectIssueDetails;
}): Promise<void> {
  const email = buildOwnerStripeConnectIssueEmail({
    businessName: input.businessName,
    businessLogoUrl: input.businessLogoUrl,
    headline: input.issue.headline,
    detail: input.issue.detail,
  });
  const tasks: Promise<unknown>[] = [];

  const ownerEmail =
    input.notificationEmail?.trim() || input.orderNotificationEmail?.trim() || null;
  if (ownerEmail) {
    tasks.push(
      deliverOwnerEmail({
        businessId: input.businessId,
        eventType: "STRIPE_CONNECT_ISSUE",
        to: ownerEmail,
        subject: email.subject,
        body: email.text,
        html: email.html,
      }),
    );
  }

  if (input.ownerId) {
    const push = buildOwnerStripeConnectIssuePush({
      headline: input.issue.headline,
      detail: input.issue.detail,
    });
    tasks.push(
      deliverPushToUsers({
        userIds: [input.ownerId],
        businessId: input.businessId,
        eventType: "STRIPE_CONNECT_ISSUE",
        title: push.title,
        body: push.body,
        deepLink: push.deepLink,
        category: "OWNER_STRIPE_ISSUE",
        respectPreferences: false,
      }),
    );
  }

  if (tasks.length) await Promise.all(tasks);
}
