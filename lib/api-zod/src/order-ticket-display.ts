export type OrderTicketPrefix = "Order" | "Ticket";

/**
 * Customer-facing ticket label. Prefer per-business sequential number when present;
 * fall back to the global database id for legacy orders.
 */
export function formatOrderTicketNumber(
  orderId: number,
  prefix: OrderTicketPrefix = "Order",
  businessOrderNumber?: number | null,
): string {
  const displayNumber =
    businessOrderNumber != null && Number.isFinite(businessOrderNumber)
      ? businessOrderNumber
      : orderId;
  return `${prefix} #${displayNumber}`;
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
