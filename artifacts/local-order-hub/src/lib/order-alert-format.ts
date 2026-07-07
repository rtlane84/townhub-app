import type { Order } from "@workspace/api-client-react";
import { formatOrderTicketNumber } from "@workspace/api-zod";

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
    formatOrderTicketNumber(order.id),
    `$${order.total.toFixed(2)}`,
    formatFulfillmentType(order.fulfillmentType),
    formatPaymentMethod(order.paymentMethod),
  ];
  return parts.join(" · ");
}

export function orderToastTitle(order: Order): string {
  return `🍔 New ${formatOrderTicketNumber(order.id)}`;
}

export function orderToastBody(order: Order): string {
  return `${order.customerName}\n${formatFulfillmentType(order.fulfillmentType)} • $${order.total.toFixed(2)}`;
}

export function orderToastTitleMultiple(count: number): string {
  return `${count} new orders`;
}

/** Single-line copy for compact mobile owner toasts. */
export function orderToastMobileTitle(order: Order): string {
  return `New ${formatOrderTicketNumber(order.id)} · ${order.customerName} · $${order.total.toFixed(2)}`;
}

export function orderToastMobileTitleMultiple(count: number, latest: Order): string {
  return `${count} new orders · Latest ${formatOrderTicketNumber(latest.id)}`;
}

export function orderBannerHeadline(order: Order, totalCount: number): string {
  if (totalCount > 1) {
    return `${totalCount} New Orders Waiting`;
  }
  return `🔔 New ${formatOrderTicketNumber(order.id)}`;
}

export function orderBannerDetails(order: Order): string {
  return [
    order.customerName,
    formatFulfillmentType(order.fulfillmentType),
    `$${order.total.toFixed(2)}`,
  ].join(" • ");
}
