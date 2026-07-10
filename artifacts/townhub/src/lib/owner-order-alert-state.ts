import type { Order } from "@workspace/api-client-react";

export function maxOrderId(orders: Order[]): number {
  if (!orders.length) return 0;
  return Math.max(...orders.map((o) => o.id));
}

export function findNewOrdersSince(
  orders: Order[],
  latestKnownId: number,
  alertedIds: ReadonlySet<number>,
): Order[] {
  return orders
    .filter((o) => o.id > latestKnownId && !alertedIds.has(o.id))
    .sort((a, b) => a.id - b.id);
}

export function isNewOrderId(
  orderId: number,
  latestKnownId: number,
  alertedIds: ReadonlySet<number>,
): boolean {
  return orderId > latestKnownId && !alertedIds.has(orderId);
}

export function resolveOrderFromList(orders: Order[], orderId: number): Order | undefined {
  return orders.find((order) => order.id === orderId);
}
