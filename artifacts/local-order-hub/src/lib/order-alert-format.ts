import type { Order } from "@workspace/api-client-react";

export function formatFulfillmentType(type: Order["fulfillmentType"]): string {
  return type === "DELIVERY" ? "Delivery" : "Pickup";
}

export function formatPaymentMethod(method?: string): string {
  if (!method) return "Payment pending";
  const normalized = method.toUpperCase();
  if (normalized === "PAY_AT_PICKUP" || normalized === "CASH") return "Pay at pickup";
  if (normalized === "STRIPE" || normalized === "ONLINE" || normalized === "CARD") return "Paid online";
  return method.replace(/_/g, " ");
}

export function orderAlertDescription(order: Order): string {
  const parts = [
    order.customerName,
    order.orderNumber ?? `#${order.id}`,
    `$${order.total.toFixed(2)}`,
    formatFulfillmentType(order.fulfillmentType),
    formatPaymentMethod(order.paymentMethod),
  ];
  return parts.join(" · ");
}
