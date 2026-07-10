import {
  normalizeSearchQuery,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "./business-order-filters.ts";
import type { KitchenFulfillmentFilter, KitchenPaymentFilter } from "./kitchen-display.ts";

const ORDERS_WORKSPACE_PREFIX = "local-order-hub:orders-workspace:";
const KITCHEN_WORKSPACE_PREFIX = "local-order-hub:kitchen-workspace:";

const DATE_PRESETS = new Set<OrderDateFilterPreset>(["today", "last7", "month", "custom", "all"]);
const FULFILLMENT_FILTERS = new Set<KitchenFulfillmentFilter>(["all", "PICKUP", "DELIVERY"]);
const PAYMENT_FILTERS = new Set<KitchenPaymentFilter>([
  "all",
  "PAID",
  "PENDING",
  "PAY AT PICKUP",
  "REFUNDED",
  "FAILED",
]);

export type OrdersWorkspaceState = {
  searchQuery: string;
  datePreset: OrderDateFilterPreset;
  customRange: OrderCustomDateRange;
  statusFilter: string;
  fulfillmentFilter: KitchenFulfillmentFilter;
  paymentFilter: KitchenPaymentFilter;
  filtersExpanded: boolean;
  scrollY: number;
};

export type KitchenWorkspaceState = {
  searchQuery: string;
  datePreset: OrderDateFilterPreset;
  customRange: OrderCustomDateRange;
  fulfillmentFilter: KitchenFulfillmentFilter;
  paymentFilter: KitchenPaymentFilter;
  filtersExpanded: boolean;
  scrollY: number;
  mobileBoardScrollLeft: number;
};

export const DEFAULT_ORDERS_WORKSPACE: OrdersWorkspaceState = {
  searchQuery: "",
  datePreset: "today",
  customRange: {},
  statusFilter: "all",
  fulfillmentFilter: "all",
  paymentFilter: "all",
  filtersExpanded: false,
  scrollY: 0,
};

export const DEFAULT_KITCHEN_WORKSPACE: KitchenWorkspaceState = {
  searchQuery: "",
  datePreset: "today",
  customRange: {},
  fulfillmentFilter: "all",
  paymentFilter: "all",
  filtersExpanded: false,
  scrollY: 0,
  mobileBoardScrollLeft: 0,
};

function ordersStorageKey(businessId: number): string {
  return `${ORDERS_WORKSPACE_PREFIX}${businessId}`;
}

function kitchenStorageKey(businessId: number): string {
  return `${KITCHEN_WORKSPACE_PREFIX}${businessId}`;
}

function parseCustomRange(value: unknown): OrderCustomDateRange {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const range: OrderCustomDateRange = {};
  if (typeof record.from === "string") range.from = record.from;
  if (typeof record.to === "string") range.to = record.to;
  return range;
}

function parseDatePreset(value: unknown): OrderDateFilterPreset {
  return typeof value === "string" && DATE_PRESETS.has(value as OrderDateFilterPreset)
    ? (value as OrderDateFilterPreset)
    : "today";
}

function parseFulfillmentFilter(value: unknown): KitchenFulfillmentFilter {
  return typeof value === "string" && FULFILLMENT_FILTERS.has(value as KitchenFulfillmentFilter)
    ? (value as KitchenFulfillmentFilter)
    : "all";
}

function parsePaymentFilter(value: unknown): KitchenPaymentFilter {
  return typeof value === "string" && PAYMENT_FILTERS.has(value as KitchenPaymentFilter)
    ? (value as KitchenPaymentFilter)
    : "all";
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function readOrdersWorkspace(businessId: number): OrdersWorkspaceState {
  if (!businessId || typeof localStorage === "undefined") {
    return { ...DEFAULT_ORDERS_WORKSPACE };
  }

  try {
    const raw = localStorage.getItem(ordersStorageKey(businessId));
    if (!raw) return { ...DEFAULT_ORDERS_WORKSPACE };
    const stored = JSON.parse(raw) as Partial<OrdersWorkspaceState>;
    return {
      searchQuery: typeof stored.searchQuery === "string" ? stored.searchQuery : "",
      datePreset: parseDatePreset(stored.datePreset),
      customRange: parseCustomRange(stored.customRange),
      statusFilter: typeof stored.statusFilter === "string" ? stored.statusFilter : "all",
      fulfillmentFilter: parseFulfillmentFilter(stored.fulfillmentFilter),
      paymentFilter: parsePaymentFilter(stored.paymentFilter),
      filtersExpanded: parseBoolean(stored.filtersExpanded, false),
      scrollY: parseNumber(stored.scrollY, 0),
    };
  } catch {
    return { ...DEFAULT_ORDERS_WORKSPACE };
  }
}

export function writeOrdersWorkspace(businessId: number, state: OrdersWorkspaceState): void {
  if (!businessId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ordersStorageKey(businessId), JSON.stringify(state));
  } catch {
    // Ignore quota / privacy errors.
  }
}

export function readKitchenWorkspace(businessId: number): KitchenWorkspaceState {
  if (!businessId || typeof localStorage === "undefined") {
    return { ...DEFAULT_KITCHEN_WORKSPACE };
  }

  try {
    const raw = localStorage.getItem(kitchenStorageKey(businessId));
    if (!raw) return { ...DEFAULT_KITCHEN_WORKSPACE };
    const stored = JSON.parse(raw) as Partial<KitchenWorkspaceState>;
    return {
      searchQuery: typeof stored.searchQuery === "string" ? stored.searchQuery : "",
      datePreset: parseDatePreset(stored.datePreset),
      customRange: parseCustomRange(stored.customRange),
      fulfillmentFilter: parseFulfillmentFilter(stored.fulfillmentFilter),
      paymentFilter: parsePaymentFilter(stored.paymentFilter),
      filtersExpanded: parseBoolean(stored.filtersExpanded, false),
      scrollY: parseNumber(stored.scrollY, 0),
      mobileBoardScrollLeft: parseNumber(stored.mobileBoardScrollLeft, 0),
    };
  } catch {
    return { ...DEFAULT_KITCHEN_WORKSPACE };
  }
}

export function writeKitchenWorkspace(businessId: number, state: KitchenWorkspaceState): void {
  if (!businessId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(kitchenStorageKey(businessId), JSON.stringify(state));
  } catch {
    // Ignore quota / privacy errors.
  }
}

/** Active advanced filters shown in the collapsed Filters label (excludes search). */
export function countOrdersPanelActiveFilters(input: {
  datePreset: OrderDateFilterPreset;
  customRange: OrderCustomDateRange;
  statusFilter: string;
  fulfillmentFilter: KitchenFulfillmentFilter;
  paymentFilter: KitchenPaymentFilter;
}): number {
  let count = 0;
  if (input.datePreset !== "today") count += 1;
  if (input.statusFilter !== "all") count += 1;
  if (input.fulfillmentFilter !== "all") count += 1;
  if (input.paymentFilter !== "all") count += 1;
  return count;
}

export function countKitchenPanelActiveFilters(input: {
  datePreset: OrderDateFilterPreset;
  customRange: OrderCustomDateRange;
  fulfillmentFilter: KitchenFulfillmentFilter;
  paymentFilter: KitchenPaymentFilter;
}): number {
  let count = 0;
  if (input.datePreset !== "today") count += 1;
  if (input.fulfillmentFilter !== "all") count += 1;
  if (input.paymentFilter !== "all") count += 1;
  return count;
}

export function ordersWorkspaceHasActiveFilters(state: Pick<
  OrdersWorkspaceState,
  "searchQuery" | "datePreset" | "customRange" | "statusFilter" | "fulfillmentFilter" | "paymentFilter"
>): boolean {
  return (
    Boolean(normalizeSearchQuery(state.searchQuery)) ||
    countOrdersPanelActiveFilters(state) > 0
  );
}

export function kitchenWorkspaceHasActiveFilters(state: Pick<
  KitchenWorkspaceState,
  "searchQuery" | "datePreset" | "customRange" | "fulfillmentFilter" | "paymentFilter"
>): boolean {
  return (
    Boolean(normalizeSearchQuery(state.searchQuery)) ||
    countKitchenPanelActiveFilters(state) > 0
  );
}
