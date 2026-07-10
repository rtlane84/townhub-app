/** Order statuses that should prompt the owner before applying. */
export const ORDER_STATUSES_REQUIRING_CONFIRMATION = new Set([
  "CANCELED",
  "COMPLETED",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
]);

export function formatOrderStatusForDisplay(status: string): string {
  return status.replace(/_/g, " ");
}

export function orderStatusNeedsConfirmation(status: string): boolean {
  return ORDER_STATUSES_REQUIRING_CONFIRMATION.has(status);
}
