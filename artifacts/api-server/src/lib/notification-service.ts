import { eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, businessesTable } from "@workspace/db";
import { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
import { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";
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
  type CustomerLifecycleEventType,
} from "./notification-delivery";

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

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    businessId: order.businessId,
    businessName: business?.name ?? "Local business",
    businessLogoUrl: business?.logoUrl,
    businessAddress: business?.address,
    pickupInstructions: business?.pickupInstructions,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod ?? "STRIPE",
    paymentStatus: order.paymentStatus ?? "PENDING",
    total: parseFloat(order.total),
    items: items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
    })),
    orderedAt: order.createdAt ?? new Date(),
    notes: order.notes,
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
  const tasks: Promise<void>[] = [];

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

  const tasks: Promise<void>[] = [];

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

  await Promise.all(tasks);
}
