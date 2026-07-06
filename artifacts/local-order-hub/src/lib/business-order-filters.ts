import {
  endOfDay,
  endOfMonth,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import type { Order } from "@workspace/api-client-react";

export const ACTIVE_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

export const HISTORY_ORDER_STATUSES = ["COMPLETED", "CANCELED"] as const;

export type OrderDateFilterPreset = "today" | "last7" | "month" | "custom" | "all";

export type OrderCustomDateRange = {
  from?: string;
  to?: string;
};

export type OrderListEmptyState = {
  title: string;
  description: string;
};

export const ORDER_DATE_FILTER_LABELS: Record<OrderDateFilterPreset, string> = {
  today: "Today",
  last7: "Last 7 days",
  month: "This month",
  custom: "Custom range",
  all: "All",
};

export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function isHistoryOrderStatus(status: string): boolean {
  return (HISTORY_ORDER_STATUSES as readonly string[]).includes(status);
}

export function parseOrderCreatedAt(createdAt?: string | Date | null): Date | null {
  if (createdAt == null) return null;
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parse `<input type="date">` values in local time (yyyy-MM-dd). */
export function parseDateInput(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

export function getOrderDateInterval(
  preset: OrderDateFilterPreset,
  customRange: OrderCustomDateRange,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  switch (preset) {
    case "all":
      return null;
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "last7":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "custom": {
      const from = customRange.from?.trim();
      const to = customRange.to?.trim();
      if (!from && !to) return null;
      return {
        start: from ? startOfDay(parseDateInput(from)) : new Date(0),
        end: to ? endOfDay(parseDateInput(to)) : endOfDay(now),
      };
    }
  }
}

export function orderCreatedInInterval(
  createdAt: string | Date | undefined | null,
  interval: { start: Date; end: Date },
): boolean {
  const date = parseOrderCreatedAt(createdAt);
  if (!date) return false;
  return isWithinInterval(date, interval);
}

/**
 * Filter orders by when they were placed. Applies to every status so date
 * presets visibly change the list.
 */
export function filterOrdersByDateView(
  orders: Order[],
  preset: OrderDateFilterPreset,
  customRange: OrderCustomDateRange = {},
  now: Date = new Date(),
): Order[] {
  if (preset === "all") {
    return sortOrdersNewestFirst(orders);
  }

  const interval = getOrderDateInterval(preset, customRange, now);
  if (!interval) {
    // Custom preset selected but no dates yet — show everything until range is set.
    return sortOrdersNewestFirst(orders);
  }

  const filtered = orders.filter((order) => orderCreatedInInterval(order.createdAt, interval));

  return sortOrdersNewestFirst(filtered);
}

export function filterOrdersByStatus(orders: Order[], statusFilter: string): Order[] {
  if (statusFilter === "all") return orders;
  if (statusFilter === "active") {
    return orders.filter((order) => isActiveOrderStatus(order.status));
  }
  return orders.filter((order) => order.status === statusFilter);
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function orderMatchesSearch(order: Order, query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;

  const phoneQuery = normalizePhoneDigits(normalized);
  const orderNumber = order.orderNumber?.toLowerCase() ?? "";
  const customerName = order.customerName?.toLowerCase() ?? "";
  const customerEmail = order.customerEmail?.toLowerCase() ?? "";
  const customerPhone = normalizePhoneDigits(order.customerPhone ?? "");

  return (
    orderNumber.includes(normalized) ||
    customerName.includes(normalized) ||
    customerEmail.includes(normalized) ||
    (phoneQuery.length > 0 && customerPhone.includes(phoneQuery))
  );
}

export function filterOrdersBySearch(orders: Order[], query: string): Order[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return orders;
  return orders.filter((order) => orderMatchesSearch(order, query));
}

export function applyBusinessOrderListFilters(
  orders: Order[],
  input: {
    datePreset: OrderDateFilterPreset;
    customRange?: OrderCustomDateRange;
    statusFilter: string;
    searchQuery: string;
    now?: Date;
  },
): Order[] {
  const dateFiltered = filterOrdersByDateView(
    orders,
    input.datePreset,
    input.customRange ?? {},
    input.now,
  );
  const statusFiltered = filterOrdersByStatus(dateFiltered, input.statusFilter);
  return filterOrdersBySearch(statusFiltered, input.searchQuery);
}

/** Date + search scope for live queue counts (status is selected via queue cards). */
export function filterOrdersForQueueSummary(
  orders: Order[],
  input: {
    datePreset: OrderDateFilterPreset;
    customRange?: OrderCustomDateRange;
    searchQuery: string;
    now?: Date;
  },
): Order[] {
  return applyBusinessOrderListFilters(orders, {
    ...input,
    statusFilter: "all",
  });
}

export function sortOrdersNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const aTime = parseOrderCreatedAt(a.createdAt)?.getTime() ?? 0;
    const bTime = parseOrderCreatedAt(b.createdAt)?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export function countActiveOrdersOutsideDateRange(
  orders: Order[],
  preset: OrderDateFilterPreset,
  customRange: OrderCustomDateRange = {},
  now: Date = new Date(),
): number {
  if (preset === "all") return 0;

  const interval = getOrderDateInterval(preset, customRange, now);
  if (!interval) return 0;

  return orders.filter((order) => {
    if (!isActiveOrderStatus(order.status)) return false;
    return !orderCreatedInInterval(order.createdAt, interval);
  }).length;
}

export function hasActiveBusinessOrderFilters(input: {
  statusFilter: string;
  datePreset: OrderDateFilterPreset;
  searchQuery: string;
  customRange: OrderCustomDateRange;
}): boolean {
  return (
    input.statusFilter !== "all" ||
    input.datePreset !== "today" ||
    Boolean(normalizeSearchQuery(input.searchQuery)) ||
    Boolean(input.customRange.from) ||
    Boolean(input.customRange.to)
  );
}

export function hasQueueScopeFilters(input: {
  datePreset: OrderDateFilterPreset;
  searchQuery: string;
  customRange: OrderCustomDateRange;
}): boolean {
  return (
    input.datePreset !== "today" ||
    Boolean(normalizeSearchQuery(input.searchQuery)) ||
    Boolean(input.customRange.from) ||
    Boolean(input.customRange.to)
  );
}

export function getOrderListDateSummary(
  preset: OrderDateFilterPreset,
  customRange: OrderCustomDateRange,
  activeOutsideRange = 0,
): string {
  let summary: string;
  switch (preset) {
    case "today":
      summary = "Orders placed today.";
      break;
    case "last7":
      summary = "Orders placed in the last 7 days.";
      break;
    case "month":
      summary = "Orders placed this month.";
      break;
    case "custom":
      if (customRange.from && customRange.to) {
        summary = `Orders placed from ${customRange.from} to ${customRange.to}.`;
      } else if (customRange.from) {
        summary = `Orders placed on or after ${customRange.from}.`;
      } else if (customRange.to) {
        summary = `Orders placed on or before ${customRange.to}.`;
      } else {
        summary = "Choose dates to filter order history.";
      }
      break;
    case "all":
      summary = "Full order history.";
      break;
  }

  if (activeOutsideRange > 0 && preset !== "all") {
    summary += ` ${activeOutsideRange} active order${activeOutsideRange === 1 ? "" : "s"} in your queue fall outside this range — choose All or widen the range.`;
  }

  return summary;
}

export function getOrderListEmptyState(input: {
  totalOrders: number;
  searchQuery: string;
  statusFilter: string;
  datePreset: OrderDateFilterPreset;
}): OrderListEmptyState {
  if (input.totalOrders === 0) {
    return {
      title: "No orders yet",
      description: "Orders will appear here once customers place them.",
    };
  }

  if (normalizeSearchQuery(input.searchQuery)) {
    return {
      title: "No matching orders",
      description: `No orders match "${input.searchQuery.trim()}". Try a different search term.`,
    };
  }

  if (input.statusFilter !== "all") {
    const status = input.statusFilter.replace(/_/g, " ").toLowerCase();
    return {
      title: "No matching orders",
      description: `No ${status} orders match the current date filter. Try another status or widen the date range.`,
    };
  }

  if (input.datePreset !== "all" && input.datePreset !== "today") {
    return {
      title: "No orders in this range",
      description: "Try a wider date range or choose All to browse full order history.",
    };
  }

  if (input.datePreset === "today" && input.statusFilter === "all" && !normalizeSearchQuery(input.searchQuery)) {
    return {
      title: "No orders today",
      description: "No orders were placed today. Choose All to browse your full order history and active queue.",
    };
  }

  return {
    title: "No orders found",
    description: "Adjust your filters to see more orders.",
  };
}
