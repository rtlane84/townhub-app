import type { BusinessOrderSummary, Order } from "@workspace/api-client-react";

export const ORDER_HIGHLIGHT_DURATION_MS = 8000;

/** Fields that affect list/detail UI when they change during polling. */
function orderRowSignature(order: Order): string {
  return [
    order.id,
    order.status,
    order.total,
    order.paymentStatus ?? "",
    order.customerName,
    order.fulfillmentType,
    order.orderNumber ?? "",
  ].join("|");
}

export function orderListsEqual(a: Order[] | undefined, b: Order[]): boolean {
  if (!a) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (orderRowSignature(a[i]!) !== orderRowSignature(b[i]!)) return false;
  }
  return true;
}

export function detectOrderListChanges(
  previous: Order[] | undefined,
  next: Order[],
): { newOrderIds: number[]; updatedOrderIds: number[]; hasChanges: boolean } {
  if (!previous) {
    return { newOrderIds: [], updatedOrderIds: [], hasChanges: next.length > 0 };
  }

  const previousById = new Map(previous.map((o) => [o.id, o]));
  const newOrderIds: number[] = [];
  const updatedOrderIds: number[] = [];

  for (const order of next) {
    const prev = previousById.get(order.id);
    if (!prev) {
      newOrderIds.push(order.id);
    } else if (orderRowSignature(prev) !== orderRowSignature(order)) {
      updatedOrderIds.push(order.id);
    }
  }

  const hasChanges =
    newOrderIds.length > 0 ||
    updatedOrderIds.length > 0 ||
    previous.length !== next.length;

  return { newOrderIds, updatedOrderIds, hasChanges };
}

function summaryStatsEqual(a: BusinessOrderSummary, b: BusinessOrderSummary): boolean {
  return (
    a.todayCount === b.todayCount &&
    a.pendingCount === b.pendingCount &&
    a.todayRevenue === b.todayRevenue &&
    (a.upcomingCount ?? 0) === (b.upcomingCount ?? 0)
  );
}

export function orderSummariesEqual(
  a: BusinessOrderSummary | undefined,
  b: BusinessOrderSummary,
): boolean {
  if (!a) return false;
  if (!summaryStatsEqual(a, b)) return false;
  if (a.recentOrders.length !== b.recentOrders.length) return false;
  for (let i = 0; i < a.recentOrders.length; i++) {
    if (orderRowSignature(a.recentOrders[i]!) !== orderRowSignature(b.recentOrders[i]!)) {
      return false;
    }
  }
  return true;
}
