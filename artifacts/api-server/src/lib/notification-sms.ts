import { customerOrderUrl, dashboardOrderUrl, dashboardAppointmentsUrl } from "./notification-urls";
import { formatNotificationEstimatedWindow, formatTime12h } from "@workspace/api-zod";
import type { CustomerLifecycleEvent, OrderNotificationData } from "./email-templates/types";

export function buildCustomerOrderReceivedSms(order: OrderNotificationData): string {
  const timing =
    order.estimatedWindowStart && order.estimatedWindowEnd
      ? ` ${formatNotificationEstimatedWindow(order.fulfillmentType, order.estimatedWindowStart, order.estimatedWindowEnd)}.`
      : "";
  return `${order.businessName} received your order #${order.orderNumber}.${timing} We'll notify you when it's accepted. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderAcceptedSms(order: OrderNotificationData): string {
  return `${order.businessName} accepted your order #${order.orderNumber}. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderPreparingSms(order: OrderNotificationData): string {
  return `Your order #${order.orderNumber} from ${order.businessName} is being prepared. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderReadySms(order: OrderNotificationData): string {
  return `Your order #${order.orderNumber} is ready for pickup at ${order.businessName}. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderOutForDeliverySms(order: OrderNotificationData): string {
  return `Your order #${order.orderNumber} from ${order.businessName} is on the way. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderCompletedSms(order: OrderNotificationData): string {
  return `Thanks for ordering from ${order.businessName}! Order #${order.orderNumber}. ${customerOrderUrl(order.orderId)}`;
}

export function buildCustomerOrderCancelledSms(order: OrderNotificationData): string {
  return `Unfortunately your order #${order.orderNumber} from ${order.businessName} was cancelled. ${customerOrderUrl(order.orderId)}`;
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
    `${order.businessName}: New order #${order.orderNumber}`,
    `${order.customerName} · $${order.total.toFixed(2)} · ${payment}`,
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
