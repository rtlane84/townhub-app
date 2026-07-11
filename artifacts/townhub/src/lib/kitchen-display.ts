import type { Order, OrderStatus } from "@workspace/api-client-react";
import {
  filterOrdersByDateView,
  filterOrdersBySearch,
  normalizeSearchQuery,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "./business-order-filters.ts";
import {
  getBusinessOrderPaymentFlag,
  type BusinessOrderPaymentFlag,
} from "./business-order-display.ts";

export type KitchenFulfillmentFilter = "all" | "PICKUP" | "DELIVERY";
export type KitchenPaymentFilter = "all" | BusinessOrderPaymentFlag;

export const KITCHEN_FULFILLMENT_FILTERS: KitchenFulfillmentFilter[] = ["all", "PICKUP", "DELIVERY"];
export const KITCHEN_PAYMENT_FILTERS: KitchenPaymentFilter[] = [
  "all",
  "PAID",
  "PENDING",
  "PAY AT PICKUP",
  "REFUNDED",
  "FAILED",
];

export const KITCHEN_FULFILLMENT_FILTER_LABELS: Record<KitchenFulfillmentFilter, string> = {
  all: "All types",
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

export const KITCHEN_PAYMENT_FILTER_LABELS: Record<KitchenPaymentFilter, string> = {
  all: "All payments",
  PAID: "Paid",
  PENDING: "Pending",
  "PAY AT PICKUP": "Pay at pickup",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

export const KITCHEN_COLUMN_DEFS = [
  { id: "NEW", label: "New", statuses: ["NEW"] as const },
  { id: "CONFIRMED", label: "Confirmed", statuses: ["CONFIRMED"] as const },
  { id: "PREPARING", label: "Preparing", statuses: ["PREPARING"] as const },
  { id: "READY", label: "Ready", statuses: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] as const },
] as const;

/** One status per column for swipeable mobile kitchen board. */
export const KITCHEN_MOBILE_COLUMN_DEFS = [
  { id: "NEW", label: "New", statuses: ["NEW"] as const },
  { id: "CONFIRMED", label: "Confirmed", statuses: ["CONFIRMED"] as const },
  { id: "PREPARING", label: "Preparing", statuses: ["PREPARING"] as const },
  { id: "READY_FOR_PICKUP", label: "Ready", statuses: ["READY_FOR_PICKUP"] as const },
  { id: "OUT_FOR_DELIVERY", label: "Out for Delivery", statuses: ["OUT_FOR_DELIVERY"] as const },
] as const;

export type KitchenColumnId = (typeof KITCHEN_COLUMN_DEFS)[number]["id"];
export type KitchenMobileColumnId = (typeof KITCHEN_MOBILE_COLUMN_DEFS)[number]["id"];

export const ACTIVE_KITCHEN_STATUSES: readonly OrderStatus[] = KITCHEN_COLUMN_DEFS.flatMap(
  (column) => column.statuses,
) as OrderStatus[];

const HIDDEN_KITCHEN_STATUSES = new Set<OrderStatus>(["COMPLETED", "CANCELED"]);

export function isActiveKitchenOrder(order: Pick<Order, "status">): boolean {
  return !HIDDEN_KITCHEN_STATUSES.has(order.status);
}

export function filterActiveKitchenOrders(orders: Order[]): Order[] {
  return orders.filter(isActiveKitchenOrder);
}

export function filterKitchenOrdersByFulfillment(
  orders: Order[],
  filter: KitchenFulfillmentFilter,
): Order[] {
  if (filter === "all") return orders;
  return orders.filter((order) => order.fulfillmentType === filter);
}

export function filterKitchenOrdersByPayment(
  orders: Order[],
  filter: KitchenPaymentFilter,
): Order[] {
  if (filter === "all") return orders;
  return orders.filter(
    (order) => getBusinessOrderPaymentFlag(order.paymentMethod, order.paymentStatus) === filter,
  );
}

export function applyKitchenDisplayFilters(
  orders: Order[],
  input: {
    datePreset: OrderDateFilterPreset;
    customRange?: OrderCustomDateRange;
    searchQuery: string;
    fulfillmentFilter: KitchenFulfillmentFilter;
    paymentFilter: KitchenPaymentFilter;
    now?: Date;
  },
): Order[] {
  let result = filterOrdersByDateView(
    orders,
    input.datePreset,
    input.customRange ?? {},
    input.now,
  );
  result = filterOrdersBySearch(result, input.searchQuery);
  result = filterKitchenOrdersByFulfillment(result, input.fulfillmentFilter);
  result = filterKitchenOrdersByPayment(result, input.paymentFilter);
  return filterActiveKitchenOrders(result);
}

export function hasKitchenDisplayFilters(input: {
  datePreset: OrderDateFilterPreset;
  searchQuery: string;
  customRange: OrderCustomDateRange;
  fulfillmentFilter: KitchenFulfillmentFilter;
  paymentFilter: KitchenPaymentFilter;
}): boolean {
  return (
    input.datePreset !== "today" ||
    Boolean(normalizeSearchQuery(input.searchQuery)) ||
    Boolean(input.customRange.from) ||
    Boolean(input.customRange.to) ||
    input.fulfillmentFilter !== "all" ||
    input.paymentFilter !== "all"
  );
}

export function getKitchenDisplayFilterSummary(
  visibleCount: number,
  totalActiveCount: number,
  filtersActive: boolean,
): string {
  if (!filtersActive || visibleCount === totalActiveCount) {
    return `${visibleCount} active ${visibleCount === 1 ? "order" : "orders"}`;
  }
  return `Showing ${visibleCount} of ${totalActiveCount} active orders (filtered)`;
}

export function groupOrdersByKitchenColumn(orders: Order[]): Record<KitchenColumnId, Order[]> {
  const grouped: Record<KitchenColumnId, Order[]> = {
    NEW: [],
    CONFIRMED: [],
    PREPARING: [],
    READY: [],
  };

  for (const order of orders) {
    if (!isActiveKitchenOrder(order)) continue;
    const column = KITCHEN_COLUMN_DEFS.find((def) =>
      (def.statuses as readonly string[]).includes(order.status),
    );
    if (column) grouped[column.id].push(order);
  }

  for (const column of KITCHEN_COLUMN_DEFS) {
    grouped[column.id].sort((a, b) => {
      const aEnd = a.estimatedWindowEnd ? new Date(a.estimatedWindowEnd).getTime() : Number.POSITIVE_INFINITY;
      const bEnd = b.estimatedWindowEnd ? new Date(b.estimatedWindowEnd).getTime() : Number.POSITIVE_INFINITY;
      if (aEnd !== bEnd) return aEnd - bEnd;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }

  return grouped;
}

export function groupOrdersByKitchenMobileColumn(
  orders: Order[],
): Record<KitchenMobileColumnId, Order[]> {
  const grouped: Record<KitchenMobileColumnId, Order[]> = {
    NEW: [],
    CONFIRMED: [],
    PREPARING: [],
    READY_FOR_PICKUP: [],
    OUT_FOR_DELIVERY: [],
  };

  for (const order of orders) {
    if (!isActiveKitchenOrder(order)) continue;
    const column = KITCHEN_MOBILE_COLUMN_DEFS.find((def) =>
      (def.statuses as readonly string[]).includes(order.status),
    );
    if (column) grouped[column.id].push(order);
  }

  for (const column of KITCHEN_MOBILE_COLUMN_DEFS) {
    grouped[column.id].sort((a, b) => {
      const aEnd = a.estimatedWindowEnd ? new Date(a.estimatedWindowEnd).getTime() : Number.POSITIVE_INFINITY;
      const bEnd = b.estimatedWindowEnd ? new Date(b.estimatedWindowEnd).getTime() : Number.POSITIVE_INFINITY;
      if (aEnd !== bEnd) return aEnd - bEnd;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }

  return grouped;
}

export type KitchenQuickAction = {
  label: string;
  nextStatus: OrderStatus;
};

export function getKitchenQuickAction(order: Pick<Order, "status" | "fulfillmentType">): KitchenQuickAction | null {
  switch (order.status) {
    case "NEW":
      return { label: "Confirm order", nextStatus: "CONFIRMED" };
    case "CONFIRMED":
      return { label: "Start preparing", nextStatus: "PREPARING" };
    case "PREPARING":
      return {
        label:
          order.fulfillmentType === "DELIVERY" ? "Out for delivery" : "Ready for pickup",
        nextStatus: order.fulfillmentType === "DELIVERY" ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP",
      };
    case "READY_FOR_PICKUP":
    case "OUT_FOR_DELIVERY":
      return { label: "Complete order", nextStatus: "COMPLETED" };
    default:
      return null;
  }
}
