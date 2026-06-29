import { notificationLogsTable } from "@workspace/db";
import {
  resolveOwnerNotificationEmail,
  resolveOwnerNotificationPhone,
} from "./owner-notification-settings";
import {
  buildOwnerNewAppointmentEmail,
  buildOwnerNewAppointmentSms,
} from "./notification-content";
import { deliverOwnerEmail, deliverOwnerSms } from "./notification-delivery";
import { logOperationalFailure } from "./operational-log";
import { logger } from "./logger";

export type { NotificationStatus, NotificationChannel, NotificationEventType } from "./notification-delivery";
export { resolveNotificationStatus } from "./notification-delivery";

export {
  notifyCustomerOrderReceived,
  notifyCustomerOrderStatusChange,
  notifyOwnerNewOrderFromOrderId,
  loadOrderNotificationData,
} from "./notification-service";

export { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
export { buildOwnerNewOrderSms, buildCustomerLifecycleSms } from "./notification-sms";
export { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";

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
        deliverOwnerEmail({
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
        deliverOwnerSms({
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
    logOperationalFailure("order_notification_failed", {
      kind: "owner_appointment_request",
      appointmentRequestId: input.appointmentRequestId,
      businessId: input.business.id,
    });
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
