import { db, notificationLogsTable } from "@workspace/db";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { logger } from "./logger";
import {
  resolveOwnerNotificationEmail,
  resolveOwnerNotificationPhone,
} from "./owner-notification-settings";
import {
  buildOwnerNewAppointmentEmail,
  buildOwnerNewAppointmentSms,
  buildOwnerNewOrderEmail,
  buildOwnerNewOrderSms,
  resolveNotificationStatus,
  type NotificationStatus,
} from "./notification-content";

export type NotificationChannel = "EMAIL" | "SMS";
export type OwnerEventType = "NEW_ORDER" | "NEW_APPOINTMENT_REQUEST";
export type CustomerEventType = "ORDER_PLACED_CUSTOMER" | "ORDER_STATUS_UPDATE";
export type NotificationEventType = OwnerEventType | CustomerEventType | "ORDER_PLACED_BUSINESS";

export type { NotificationStatus } from "./notification-content";
export {
  buildOwnerNewAppointmentEmail,
  buildOwnerNewAppointmentSms,
  buildOwnerNewOrderEmail,
  buildOwnerNewOrderSms,
  buildOrderConfirmationEmail,
  buildOrderPlacedBusinessEmail,
  buildStatusUpdateEmail,
  resolveNotificationStatus,
} from "./notification-content";

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
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
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
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
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

  try {
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
  } catch (err) {
    logger.error({ err, orderId: input.orderId }, "Owner new order notification failed");
  }
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

  try {
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
  } catch (err) {
    logger.error(
      { err, appointmentRequestId: input.appointmentRequestId },
      "Owner appointment request notification failed",
    );
  }
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
