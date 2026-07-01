import { db, notificationLogsTable } from "@workspace/db";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { logger } from "./logger";
import { logOperationalFailure } from "./operational-log";
import { resolveNotificationStatus, type NotificationStatus } from "./notification-content";

import type {
  SubscriptionNotificationEvent,
  PlatformAdminSubscriptionEvent,
} from "./email-templates/types";

export type NotificationChannel = "EMAIL" | "SMS";
export type OwnerEventType =
  | "NEW_ORDER"
  | "NEW_APPOINTMENT_REQUEST"
  | "APPLICATION_APPROVED"
  | SubscriptionNotificationEvent
  | PlatformAdminSubscriptionEvent;

export type CustomerLifecycleEventType =
  | "ORDER_RECEIVED"
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY_FOR_PICKUP"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED";

export type CustomerAppointmentEventType = "APPOINTMENT_CONFIRMED" | "APPOINTMENT_DECLINED";

export type NotificationEventType =
  | OwnerEventType
  | CustomerLifecycleEventType
  | CustomerAppointmentEventType;

export { resolveNotificationStatus, type NotificationStatus };

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

export async function deliverOwnerEmail(input: {
  businessId: number;
  eventType: OwnerEventType;
  to: string;
  subject: string;
  body: string;
  html?: string;
  orderId?: number;
  appointmentRequestId?: number;
}): Promise<void> {
  const result = await sendEmail(input.to, input.subject, input.body, input.html);
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
    logger.info({ eventType: input.eventType, subject: input.subject }, `[NOTIFICATION LOG] ${input.eventType}`);
  } else if (status === "FAILED") {
    logOperationalFailure("order_notification_email_failed", {
      eventType: input.eventType,
      businessId: input.businessId,
      orderId: input.orderId,
      appointmentRequestId: input.appointmentRequestId,
    });
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

export async function deliverOwnerApplicationEmail(input: {
  businessId: number;
  eventType: "APPLICATION_APPROVED";
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<void> {
  const result = await sendEmail(input.to, input.subject, input.body, input.html);
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
    logger.info({ eventType: input.eventType, subject: input.subject }, `[NOTIFICATION LOG] ${input.eventType}`);
  } else if (status === "FAILED") {
    logOperationalFailure("application_notification_email_failed", {
      eventType: input.eventType,
      businessId: input.businessId,
    });
  }

  await logNotification({
    businessId: input.businessId,
    channel: "EMAIL",
    eventType: input.eventType,
    recipientEmail: input.to,
    subject: input.subject,
    body: input.body,
    status,
    errorMessage: result.error,
  });
}

export async function deliverOwnerSubscriptionEmail(input: {
  businessId: number;
  eventType: SubscriptionNotificationEvent;
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<void> {
  const result = await sendEmail(input.to, input.subject, input.body, input.html);
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
    logger.info({ eventType: input.eventType, subject: input.subject }, `[NOTIFICATION LOG] ${input.eventType}`);
  } else if (status === "FAILED") {
    logOperationalFailure("subscription_notification_email_failed", {
      eventType: input.eventType,
      businessId: input.businessId,
    });
  }

  await logNotification({
    businessId: input.businessId,
    channel: "EMAIL",
    eventType: input.eventType,
    recipientEmail: input.to,
    subject: input.subject,
    body: input.body,
    status,
    errorMessage: result.error,
  });
}

export async function deliverPlatformAdminSubscriptionEmail(input: {
  businessId: number;
  eventType: PlatformAdminSubscriptionEvent;
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<void> {
  const result = await sendEmail(input.to, input.subject, input.body, input.html);
  const status = resolveNotificationStatus(result);

  if (status === "LOGGED") {
    logger.info({ eventType: input.eventType, subject: input.subject }, `[ADMIN NOTIFICATION LOG] ${input.eventType}`);
  } else if (status === "FAILED") {
    logOperationalFailure("subscription_admin_notification_email_failed", {
      eventType: input.eventType,
      businessId: input.businessId,
    });
  }

  await logNotification({
    businessId: input.businessId,
    channel: "EMAIL",
    eventType: input.eventType,
    recipientEmail: input.to,
    subject: input.subject,
    body: input.body,
    status,
    errorMessage: result.error,
  });
}

export async function deliverOwnerSms(input: {
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
    logger.info({ eventType: input.eventType }, `[NOTIFICATION LOG SMS] ${input.eventType}`);
  } else if (status === "FAILED") {
    logOperationalFailure("order_notification_sms_failed", {
      eventType: input.eventType,
      businessId: input.businessId,
      orderId: input.orderId,
      appointmentRequestId: input.appointmentRequestId,
    });
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

export async function deliverCustomerNotification(input: {
  businessId: number;
  orderId: number;
  eventType: CustomerLifecycleEventType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  html?: string;
}): Promise<void> {
  const result =
    input.channel === "EMAIL"
      ? await sendEmail(input.recipient, input.subject ?? "Order update", input.body, input.html)
      : await sendSms(input.recipient, input.body);

  const status = resolveNotificationStatus(result);

  if (status === "FAILED") {
    logOperationalFailure(
      input.channel === "EMAIL" ? "order_notification_email_failed" : "order_notification_sms_failed",
      { eventType: input.eventType, businessId: input.businessId, orderId: input.orderId },
    );
  }

  await logNotification({
    businessId: input.businessId,
    channel: input.channel,
    eventType: input.eventType,
    recipientEmail: input.channel === "EMAIL" ? input.recipient : undefined,
    recipientPhone: input.channel === "SMS" ? input.recipient : undefined,
    subject: input.subject,
    body: input.body,
    status,
    orderId: input.orderId,
    errorMessage: result.error,
  });
}

export async function deliverAppointmentCustomerNotification(input: {
  businessId: number;
  appointmentRequestId: number;
  eventType: CustomerAppointmentEventType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  html?: string;
}): Promise<void> {
  const result =
    input.channel === "EMAIL"
      ? await sendEmail(input.recipient, input.subject ?? "Appointment update", input.body, input.html)
      : await sendSms(input.recipient, input.body);

  const status = resolveNotificationStatus(result);

  if (status === "FAILED") {
    logOperationalFailure(
      input.channel === "EMAIL"
        ? "appointment_customer_notification_failed"
        : "appointment_customer_notification_sms_failed",
      {
        eventType: input.eventType,
        businessId: input.businessId,
        appointmentRequestId: input.appointmentRequestId,
      },
    );
  }

  await logNotification({
    businessId: input.businessId,
    channel: input.channel,
    eventType: input.eventType,
    recipientEmail: input.channel === "EMAIL" ? input.recipient : undefined,
    recipientPhone: input.channel === "SMS" ? input.recipient : undefined,
    subject: input.subject,
    body: input.body,
    status,
    appointmentRequestId: input.appointmentRequestId,
    errorMessage: result.error,
  });
}
