import {
  db,
  ordersTable,
  orderItemsTable,
  orderItemOptionsTable,
  orderRefundsTable,
  businessesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { serializeOrderRefunds } from "./order-refund";
import type { SerializedOrderRefund } from "./order-refund";
import {
  buildSerializedOrder,
  groupRowsByKey,
  type OrderViewerContext,
  type SerializedOrder,
} from "./order-serialization-core";

export type OrderRow = typeof ordersTable.$inferSelect;
type OrderItemRow = typeof orderItemsTable.$inferSelect;
type OrderItemOptionRow = typeof orderItemOptionsTable.$inferSelect;

export type { OrderViewerContext, SerializedOrder };
export { buildSerializedOrder, groupRowsByKey };

export async function loadOptionsByOrderItemIds(itemIds: number[]) {
  const map = new Map<number, OrderItemOptionRow[]>();
  if (itemIds.length === 0) return map;

  const rows = await db
    .select()
    .from(orderItemOptionsTable)
    .where(inArray(orderItemOptionsTable.orderItemId, itemIds));

  for (const row of rows) {
    const list = map.get(row.orderItemId) ?? [];
    list.push(row);
    map.set(row.orderItemId, list);
  }
  return map;
}

async function loadOrderItemsByOrderIds(orderIds: number[]): Promise<Map<number, OrderItemRow[]>> {
  if (orderIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));

  return groupRowsByKey(rows, (row) => row.orderId);
}

async function loadSerializedRefundsByOrderIds(
  orderIds: number[],
): Promise<Map<number, SerializedOrderRefund[]>> {
  const map = new Map<number, SerializedOrderRefund[]>();
  if (orderIds.length === 0) return map;

  const refunds = await db
    .select()
    .from(orderRefundsTable)
    .where(inArray(orderRefundsTable.orderId, orderIds))
    .orderBy(orderRefundsTable.createdAt);

  if (refunds.length === 0) return map;

  const serialized = await serializeOrderRefunds(refunds);
  for (let i = 0; i < refunds.length; i++) {
    const refund = refunds[i]!;
    const entry = serialized[i]!;
    const list = map.get(refund.orderId) ?? [];
    list.push(entry);
    map.set(refund.orderId, list);
  }
  return map;
}

export async function serializeOrdersBatch(
  orders: OrderRow[],
  businessNameForOrder: (order: OrderRow) => string,
  viewer: OrderViewerContext = { includeRefundDetails: false },
): Promise<SerializedOrder[]> {
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);
  const [itemsByOrderId, refundsByOrderId] = await Promise.all([
    loadOrderItemsByOrderIds(orderIds),
    viewer.includeRefundDetails
      ? loadSerializedRefundsByOrderIds(orderIds)
      : Promise.resolve(new Map<number, SerializedOrderRefund[]>()),
  ]);

  const allItemIds = [...itemsByOrderId.values()].flat().map((item) => item.id);
  const optionsByItemId = await loadOptionsByOrderItemIds(allItemIds);

  return orders.map((order) =>
    buildSerializedOrder(
      order as Parameters<typeof buildSerializedOrder>[0],
      itemsByOrderId.get(order.id) ?? [],
      businessNameForOrder(order),
      optionsByItemId,
      viewer,
      refundsByOrderId.get(order.id),
    ),
  );
}

export async function loadBusinessNameMap(
  businessIds: number[],
): Promise<Map<number, string>> {
  if (businessIds.length === 0) return new Map();

  const rows = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .where(inArray(businessesTable.id, businessIds));

  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function serializeOrderWithLoadedItems(
  order: OrderRow,
  businessName: string,
  viewer: OrderViewerContext = { includeRefundDetails: false },
) {
  const [serialized] = await serializeOrdersBatch([order], () => businessName, viewer);
  return serialized;
}

export async function getOrderWithItems(
  orderId: number,
  viewer: OrderViewerContext = { includeRefundDetails: false },
) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const [business] = await db
    .select({ name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  return serializeOrderWithLoadedItems(order, business?.name ?? "Unknown", viewer);
}
