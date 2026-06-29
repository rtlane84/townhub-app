import { formatTime12h } from "@workspace/api-zod";
import {
  dashboardAppointmentsUrl,
  dashboardOrderUrl,
  paymentMethodLabel,
} from "./owner-notification-settings";

export type NotificationStatus = "SENT" | "LOGGED" | "FAILED";

type DeliveryResult = {
  sent: boolean;
  providerUnavailable?: boolean;
  error?: string;
};

export function resolveNotificationStatus(result: DeliveryResult): NotificationStatus {
  if (result.sent) return "SENT";
  if (result.providerUnavailable) return "LOGGED";
  return "FAILED";
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
    `Requested: ${request.requestedDate} at ${formatTime12h(request.requestedTime)}`,
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
    `${request.customerName}${service} · ${request.requestedDate} ${formatTime12h(request.requestedTime)}`,
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
