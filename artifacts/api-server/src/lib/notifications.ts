import { db, notificationLogsTable } from "@workspace/db";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { logger } from "./logger";
import {
  dashboardAppointmentsUrl,
  dashboardOrderUrl,
  paymentMethodLabel,
  resolveOwnerNotificationEmail,
  resolveOwnerNotificationPhone,
} from "./owner-notification-settings";

export type NotificationChannel = "EMAIL" | "SMS";
export type OwnerEventType = "NEW_ORDER" | "NEW_APPOINTMENT_REQUEST";
export type CustomerEventType = "ORDER_PLACED_CUSTOMER" | "ORDER_STATUS_UPDATE";
export type NotificationEventType = OwnerEventType | CustomerEventType | "ORDER_PLACED_BUSINESS";

export type NotificationStatus = "SENT" | "LOGGED" | "FAILED";

interface LogNotificationInput {
  businessId: number;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  body: string;
  status: NotificationStatus;
  orderId?: number;
  appointmentRequestId?: number;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  errorMessage?: string;
}

async function logNotification(input: LogNotificationInput): Promise<void> {
  try {
    await db.insert(notificationLogsTable).values({
      businessId: input.businessId,
      orderId: input.orderId ?? null,
      appointmentRequestId: input.appointmentRequestId ?? null,
      channel: input.channel,
      eventType: input.eventType,
      type: input.eventType,
      recipientEmail: input.recipientEmail ?? null,
      recipientPhone: input.recipientPhone ?? null,
      subject: input.subject ?? null,
      body: input.body,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    });
  } catch (err) {
    logger.error({ err, eventType: input.eventType }, "Failed to write notification log");
  }
}

async function deliverEmailNotification(input: {
  businessId: number;
  eventType: NotificationEventType;
  to: string;
  subject: string;
  body: string;
  orderId?: number;
  appointmentRequestId?: number;
}): Promise<void> {
  const result = await sendEmail(input.to, input.subject, input.body);
  const status: NotificationStatus = result.sent ? "SENT" : result.error ? "FAILED" : "LOGGED";

  if (!result.sent && !result.error) {
    logger.info(
      { eventType: input.eventType, to: input.to, subject: input.subject },
      `[NOTIFICATION LOG] ${input.eventType} → ${input.to}`,
    );
  }

  await logNotification({
    businessId: input.businessId,
    channel: "EMAIL",
    eventType: input.eventType,
    recipientEmail: input.to,
    subject: input.subject,
    body: input.body,
    status,
    orderId: input.orderId,
    appointmentRequestId: input.appointmentRequestId,
    errorMessage: result.error,
  });
}

async function deliverSmsNotification(input: {
  businessId: number;
  eventType: OwnerEventType;
  to: string;
  body: string;
  orderId?: number;
  appointmentRequestId?: number;
}): Promise<void> {
  const result = await sendSms(input.to, input.body);
  const status: NotificationStatus = result.sent ? "SENT" : result.error ? "FAILED" : "LOGGED";

  if (!result.sent && !result.error) {
    logger.info({ eventType: input.eventType, to: input.to }, `[NOTIFICATION LOG SMS] ${input.eventType}`);
  }

  await logNotification({
    businessId: input.businessId,
    channel: "SMS",
    eventType: input.eventType,
    recipientPhone: input.to,
    body: input.body,
    status,
    orderId: input.orderId,
    appointmentRequestId: input.appointmentRequestId,
    errorMessage: result.error,
  });
}

/** Customer email-only notifications (order confirmation, status updates). */
export async function sendCustomerEmailNotification(payload: {
  businessId: number;
  orderId: number;
  eventType: CustomerEventType;
  recipientEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  await deliverEmailNotification({
    businessId: payload.businessId,
    eventType: payload.eventType,
    to: payload.recipientEmail,
    subject: payload.subject,
    body: payload.body,
    orderId: payload.orderId,
  }).catch((err) => {
    logger.error({ err, orderId: payload.orderId }, "Customer notification failed");
  });
}

/** @deprecated Use sendCustomerEmailNotification */
export async function sendOrderNotification(payload: {
  type: NotificationEventType;
  businessId: number;
  orderId: number;
  recipientEmail: string;
  subject: string;
  body: string;
}): Promise<void> {
  await sendCustomerEmailNotification({
    businessId: payload.businessId,
    orderId: payload.orderId,
    eventType: payload.type as CustomerEventType,
    recipientEmail: payload.recipientEmail,
    subject: payload.subject,
    body: payload.body,
  });
}

export async function notifyOwnerNewOrder(input: {
  business: {
    id: number;
    name: string;
    notificationEmail?: string | null;
    orderNotificationEmail?: string | null;
    notificationPhone?: string | null;
    notifyNewOrdersByEmail?: boolean | null;
    notifyNewOrdersBySms?: boolean | null;
  };
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  fulfillmentType: string;
  items: Array<{ productName: string; quantity: number }>;
}): Promise<void> {
  const { subject, body: emailBody } = buildOwnerNewOrderEmail({
    businessName: input.business.name,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    total: input.total,
    paymentMethod: input.paymentMethod,
    fulfillmentType: input.fulfillmentType,
    items: input.items,
    orderId: input.orderId,
  });
  const smsBody = buildOwnerNewOrderSms({
    businessName: input.business.name,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    total: input.total,
    paymentMethod: input.paymentMethod,
    orderId: input.orderId,
  });

  const email = resolveOwnerNotificationEmail(input.business);
  const phone = resolveOwnerNotificationPhone(input.business);

  const tasks: Promise<void>[] = [];

  if (input.business.notifyNewOrdersByEmail !== false && email) {
    tasks.push(
      deliverEmailNotification({
        businessId: input.business.id,
        eventType: "NEW_ORDER",
        to: email,
        subject,
        body: emailBody,
        orderId: input.orderId,
      }),
    );
  }

  if (input.business.notifyNewOrdersBySms && phone) {
    tasks.push(
      deliverSmsNotification({
        businessId: input.business.id,
        eventType: "NEW_ORDER",
        to: phone,
        body: smsBody,
        orderId: input.orderId,
      }),
    );
  }

  await Promise.all(tasks);
}

export async function notifyOwnerNewAppointmentRequest(input: {
  business: {
    id: number;
    name: string;
    notificationEmail?: string | null;
    orderNotificationEmail?: string | null;
    notificationPhone?: string | null;
    notifyAppointmentRequestsByEmail?: boolean | null;
    notifyAppointmentRequestsBySms?: boolean | null;
  };
  appointmentRequestId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string | null;
}): Promise<void> {
  const { subject, body: emailBody } = buildOwnerNewAppointmentEmail({
    businessName: input.business.name,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    serviceName: input.serviceName,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
    notes: input.notes,
  });
  const smsBody = buildOwnerNewAppointmentSms({
    businessName: input.business.name,
    customerName: input.customerName,
    serviceName: input.serviceName,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
  });

  const email = resolveOwnerNotificationEmail(input.business);
  const phone = resolveOwnerNotificationPhone(input.business);

  const tasks: Promise<void>[] = [];

  if (input.business.notifyAppointmentRequestsByEmail !== false && email) {
    tasks.push(
      deliverEmailNotification({
        businessId: input.business.id,
        eventType: "NEW_APPOINTMENT_REQUEST",
        to: email,
        subject,
        body: emailBody,
        appointmentRequestId: input.appointmentRequestId,
      }),
    );
  }

  if (input.business.notifyAppointmentRequestsBySms && phone) {
    tasks.push(
      deliverSmsNotification({
        businessId: input.business.id,
        eventType: "NEW_APPOINTMENT_REQUEST",
        to: phone,
        body: smsBody,
        appointmentRequestId: input.appointmentRequestId,
      }),
    );
  }

  await Promise.all(tasks);
}

export function buildOwnerNewOrderEmail(order: {
  businessName: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  fulfillmentType: string;
  items: Array<{ productName: string; quantity: number }>;
  orderId: number;
}): { subject: string; body: string } {
  const subject = `New order ${order.orderNumber} — ${order.businessName}`;
  const itemLines = order.items.map((i) => `  - ${i.productName} x${i.quantity}`).join("\n");
  const body = [
    `New order for ${order.businessName}`,
    ``,
    `Order #: ${order.orderNumber}`,
    `Customer: ${order.customerName}${order.customerEmail ? ` <${order.customerEmail}>` : ""}`,
    `Payment: ${paymentMethodLabel(order.paymentMethod)}`,
    `Fulfillment: ${order.fulfillmentType}`,
    `Total: $${order.total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    `View in dashboard: ${dashboardOrderUrl(order.orderId)}`,
  ].join("\n");
  return { subject, body };
}

export function buildOwnerNewOrderSms(order: {
  businessName: string;
  orderNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  orderId: number;
}): string {
  return [
    `${order.businessName}: New order ${order.orderNumber}`,
    `${order.customerName} · $${order.total.toFixed(2)} · ${paymentMethodLabel(order.paymentMethod)}`,
    dashboardOrderUrl(order.orderId),
  ].join("\n");
}

export function buildOwnerNewAppointmentEmail(request: {
  businessName: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string | null;
}): { subject: string; body: string } {
  const subject = `New appointment request — ${request.businessName}`;
  const body = [
    `New appointment request for ${request.businessName}`,
    ``,
    `Customer: ${request.customerName}`,
    request.serviceName ? `Service: ${request.serviceName}` : "",
    `Requested: ${request.requestedDate} at ${request.requestedTime}`,
    request.customerEmail ? `Email: ${request.customerEmail}` : "",
    request.customerPhone ? `Phone: ${request.customerPhone}` : "",
    request.notes ? `\nNotes: ${request.notes}` : "",
    ``,
    `View requests: ${dashboardAppointmentsUrl()}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, body };
}

export function buildOwnerNewAppointmentSms(request: {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}): string {
  const service = request.serviceName ? ` · ${request.serviceName}` : "";
  return [
    `${request.businessName}: New appointment request`,
    `${request.customerName}${service} · ${request.requestedDate} ${request.requestedTime}`,
    dashboardAppointmentsUrl(),
  ].join("\n");
}

export function buildOrderPlacedBusinessEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  fulfillmentType: string;
  notes?: string | null;
}): { subject: string; body: string } {
  const subject = `New order ${order.orderNumber} from ${order.customerName}`;
  const itemLines = order.items
    .map((i) => `  - ${i.productName} x${i.quantity} @ $${i.unitPrice.toFixed(2)}`)
    .join("\n");
  const body = [
    `A new order has been placed!`,
    ``,
    `Order #: ${order.orderNumber}`,
    `Customer: ${order.customerName} <${order.customerEmail}>`,
    `Fulfillment: ${order.fulfillmentType}`,
    `Total: $${order.total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    order.notes ? `\nCustomer notes: ${order.notes}` : "",
    ``,
    `Log in to your dashboard to confirm and prepare this order.`,
  ].join("\n");
  return { subject, body };
}

export function buildOrderConfirmationEmail(order: {
  orderNumber: string;
  businessName: string;
  total: number;
  items: Array<{ productName: string; quantity: number }>;
  fulfillmentType: string;
  customerName: string;
}): { subject: string; body: string } {
  const subject = `Your order ${order.orderNumber} is confirmed — ${order.businessName}`;
  const itemLines = order.items.map((i) => `  - ${i.productName} x${i.quantity}`).join("\n");
  const body = [
    `Hi ${order.customerName},`,
    ``,
    `Thanks for your order from ${order.businessName}!`,
    ``,
    `Order #: ${order.orderNumber}`,
    `Fulfillment: ${order.fulfillmentType}`,
    `Total: $${order.total.toFixed(2)}`,
    ``,
    `Items:`,
    itemLines,
    ``,
    `We'll send you another update when your order status changes.`,
    `Thank you for supporting local!`,
  ].join("\n");
  return { subject, body };
}

export function buildStatusUpdateEmail(order: {
  orderNumber: string;
  businessName: string;
  status: string;
  customerName: string;
}): { subject: string; body: string } {
  const statusMessages: Record<string, string> = {
    CONFIRMED: "has been confirmed",
    PREPARING: "is being prepared",
    READY_FOR_PICKUP: "is ready for pickup — come pick it up!",
    OUT_FOR_DELIVERY: "is out for delivery",
    COMPLETED: "has been completed",
    CANCELED: "has been canceled",
  };
  const msg = statusMessages[order.status] ?? `status changed to ${order.status}`;
  const subject = `Order ${order.orderNumber} ${msg}`;
  const body = [
    `Hi ${order.customerName},`,
    ``,
    `Your order ${order.orderNumber} from ${order.businessName} ${msg}.`,
    ``,
    `Thank you for supporting local!`,
  ].join("\n");
  return { subject, body };
}

export function serializeNotificationLog(row: typeof notificationLogsTable.$inferSelect) {
  return {
    id: row.id,
    businessId: row.businessId,
    orderId: row.orderId,
    appointmentRequestId: row.appointmentRequestId,
    channel: row.channel,
    eventType: row.eventType ?? row.type ?? null,
    type: row.eventType ?? row.type ?? null,
    recipientEmail: row.recipientEmail,
    recipientPhone: row.recipientPhone,
    subject: row.subject,
    body: row.body,
    status: row.status,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}
