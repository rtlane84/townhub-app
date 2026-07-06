import {
  customerOrderUrlForNotification,
  dashboardOrderUrl,
  dashboardAppointmentsUrl,
} from "./notification-urls";
import {
  formatNotificationEstimatedWindow,
  formatOrderTicketNumber,
  formatTime12h,
} from "@workspace/api-zod";
import type { CustomerLifecycleEvent, OrderNotificationData } from "./email-templates/types";
import {
  formatOrderTotalsTextLines,
  orderTotalsSummaryFromNotification,
} from "./email-templates/types";

export function buildCustomerOrderReceivedSms(order: OrderNotificationData): string {
  const ticketLabel = formatOrderTicketNumber(order.orderId);
  const timing =
    order.estimatedWindowStart && order.estimatedWindowEnd
      ? ` ${formatNotificationEstimatedWindow(order.fulfillmentType, order.estimatedWindowStart, order.estimatedWindowEnd)}.`
      : "";
  return `${order.businessName} received ${ticketLabel}.${timing} We'll notify you when it's accepted. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderAcceptedSms(order: OrderNotificationData): string {
  return `${order.businessName} accepted ${formatOrderTicketNumber(order.orderId)}. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderPreparingSms(order: OrderNotificationData): string {
  return `${formatOrderTicketNumber(order.orderId)} from ${order.businessName} is being prepared. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderReadySms(order: OrderNotificationData): string {
  return `${formatOrderTicketNumber(order.orderId)} is ready for pickup at ${order.businessName}. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderOutForDeliverySms(order: OrderNotificationData): string {
  return `${formatOrderTicketNumber(order.orderId)} from ${order.businessName} is on the way. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderCompletedSms(order: OrderNotificationData): string {
  return `Thanks for ordering from ${order.businessName}! ${formatOrderTicketNumber(order.orderId)}. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerOrderCancelledSms(order: OrderNotificationData): string {
  return `Unfortunately ${formatOrderTicketNumber(order.orderId)} from ${order.businessName} was cancelled. ${customerOrderUrlForNotification(order)}`;
}

export function buildCustomerLifecycleSms(
  event: CustomerLifecycleEvent,
  order: OrderNotificationData,
): string {
  switch (event) {
    case "ORDER_RECEIVED":
      return buildCustomerOrderReceivedSms(order);
    case "ORDER_ACCEPTED":
      return buildCustomerOrderAcceptedSms(order);
    case "ORDER_PREPARING":
      return buildCustomerOrderPreparingSms(order);
    case "ORDER_READY_FOR_PICKUP":
      return buildCustomerOrderReadySms(order);
    case "ORDER_OUT_FOR_DELIVERY":
      return buildCustomerOrderOutForDeliverySms(order);
    case "ORDER_COMPLETED":
      return buildCustomerOrderCompletedSms(order);
    case "ORDER_CANCELLED":
      return buildCustomerOrderCancelledSms(order);
  }
}

export function buildOwnerNewOrderSms(order: OrderNotificationData): string {
  const payment =
    order.paymentMethod === "IN_PERSON" ? "Pay at pickup" : order.paymentStatus === "PAID" ? "Paid" : "Card";
  const timing =
    order.estimatedWindowStart && order.estimatedWindowEnd
      ? formatNotificationEstimatedWindow(
          order.fulfillmentType,
          order.estimatedWindowStart,
          order.estimatedWindowEnd,
        )
      : "ASAP";
  return [
    `${order.businessName}: New ${formatOrderTicketNumber(order.orderId)}`,
    `${order.customerName} · $${order.total.toFixed(2)} · ${payment}`,
    ...formatOrderTotalsTextLines(orderTotalsSummaryFromNotification(order)),
    timing,
    dashboardOrderUrl(order.orderId),
  ].join("\n");
}

type AppointmentSmsData = {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
  statusNote?: string | null;
};

function formatAppointmentSmsWhen(date: string, time: string): string {
  return `${date} ${formatTime12h(time)}`;
}

export function buildOwnerNewAppointmentSms(data: AppointmentSmsData): string {
  const service = data.serviceName ? ` · ${data.serviceName}` : "";
  return [
    `${data.businessName}: New appointment request`,
    `${data.customerName}${service} · ${formatAppointmentSmsWhen(data.requestedDate, data.requestedTime)}`,
    dashboardAppointmentsUrl(),
  ].join("\n");
}

export function buildCustomerAppointmentConfirmedSms(data: AppointmentSmsData): string {
  const service = data.serviceName ? ` (${data.serviceName})` : "";
  return `${data.businessName} confirmed your appointment${service} for ${formatAppointmentSmsWhen(data.requestedDate, data.requestedTime)}. Contact them if you need to make changes.`;
}

export function buildCustomerAppointmentDeclinedSms(data: AppointmentSmsData): string {
  const note = data.statusNote?.trim() ? ` ${data.statusNote.trim()}` : "";
  return `${data.businessName} could not confirm your appointment request for ${formatAppointmentSmsWhen(data.requestedDate, data.requestedTime)}.${note} Please contact them to reschedule.`;
}

export function buildCustomerAppointmentStatusSms(
  data: AppointmentSmsData & { status: "CONFIRMED" | "DECLINED" },
): string {
  return data.status === "CONFIRMED"
    ? buildCustomerAppointmentConfirmedSms(data)
    : buildCustomerAppointmentDeclinedSms(data);
}
