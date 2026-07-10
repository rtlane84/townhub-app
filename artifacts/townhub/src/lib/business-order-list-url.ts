import type { OrderDateFilterPreset } from "./business-order-filters";

const DATE_PRESET_VALUES = new Set<OrderDateFilterPreset>([
  "today",
  "last7",
  "month",
  "custom",
  "all",
]);

export type OrdersPageUrlState = {
  datePreset?: OrderDateFilterPreset;
  statusFilter?: string;
};

export function isOrderDateFilterPreset(value: string): value is OrderDateFilterPreset {
  return DATE_PRESET_VALUES.has(value as OrderDateFilterPreset);
}

export function parseOrdersPageSearch(search: string): OrdersPageUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state: OrdersPageUrlState = {};
  const date = params.get("date");
  if (date && isOrderDateFilterPreset(date)) {
    state.datePreset = date;
  }
  const status = params.get("status")?.trim();
  if (status) {
    state.statusFilter = status;
  }
  return state;
}

export function buildOrdersPageHref(state: OrdersPageUrlState): string {
  const params = new URLSearchParams();
  if (state.datePreset) params.set("date", state.datePreset);
  if (state.statusFilter) params.set("status", state.statusFilter);
  const qs = params.toString();
  return `/dashboard/business/orders${qs ? `?${qs}` : ""}`;
}

/** Deep links from the Overview KPI cards. */
export const OVERVIEW_ORDERS_LINKS = {
  today: buildOrdersPageHref({ datePreset: "today" }),
  todayCompleted: buildOrdersPageHref({ datePreset: "today", statusFilter: "COMPLETED" }),
  active: buildOrdersPageHref({ datePreset: "all", statusFilter: "active" }),
} as const;

export const OVERVIEW_KITCHEN_HREF = "/dashboard/business/kitchen";

export function businessOrderDetailPath(orderId: number): string {
  return `/dashboard/business/orders/${orderId}`;
}
