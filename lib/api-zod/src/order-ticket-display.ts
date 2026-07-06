export type OrderTicketPrefix = "Order" | "Ticket";

export function formatOrderTicketNumber(
  orderId: number,
  prefix: OrderTicketPrefix = "Order",
): string {
  return `${prefix} #${orderId}`;
}

export function formatOrderReferenceNumber(orderNumber?: string | null): string | null {
  const trimmed = orderNumber?.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function formatOrderReferenceLabel(orderNumber?: string | null): string | null {
  const reference = formatOrderReferenceNumber(orderNumber);
  return reference ? `Reference: ${reference}` : null;
}
