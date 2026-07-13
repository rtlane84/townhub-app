/**
 * Canonical order-status color system for TownHub.
 * Use these helpers everywhere (orders list, kitchen, detail, filters, badges).
 *
 * Palette:
 * - New → Blue (incoming)
 * - Confirmed → Purple (accepted)
 * - Preparing → Orange (in progress)
 * - Ready for Pickup → Green (needs customer action)
 * - Out for Delivery → Cyan (in transit)
 * - Completed → Neutral gray (finished / inactive)
 * - Canceled → Red
 */

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELED",
] as const;

export type OrderStatusColorKey = (typeof ORDER_STATUSES)[number];

/** Soft filled status pill (lists, detail, my-orders, admin). */
export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatusColorKey, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-purple-100 text-purple-800",
  PREPARING: "bg-orange-100 text-orange-900",
  READY_FOR_PICKUP: "bg-green-100 text-green-900",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-900",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELED: "bg-red-100 text-red-800",
};

/** Pill with border (kitchen column headers, bordered chips). */
export const ORDER_STATUS_BADGE_BORDERED_CLASS: Record<OrderStatusColorKey, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  CONFIRMED: "bg-purple-100 text-purple-800 border-purple-200",
  PREPARING: "bg-orange-100 text-orange-900 border-orange-200",
  READY_FOR_PICKUP: "bg-green-100 text-green-900 border-green-200",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-900 border-cyan-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELED: "bg-red-100 text-red-800 border-red-200",
};

/** Left-border + tint accents for queue summary tiles. */
export const ORDER_STATUS_QUEUE_ACCENT_CLASS: Record<
  Exclude<OrderStatusColorKey, "COMPLETED" | "CANCELED">,
  string
> = {
  NEW: "border-l-blue-500 bg-blue-50/40",
  CONFIRMED: "border-l-purple-500 bg-purple-50/40",
  PREPARING: "border-l-orange-500 bg-orange-50/40",
  READY_FOR_PICKUP: "border-l-green-500 bg-green-50/40",
  OUT_FOR_DELIVERY: "border-l-cyan-500 bg-cyan-50/40",
};

/** Selected/active queue summary tile. */
export const ORDER_STATUS_QUEUE_ACTIVE_CLASS: Record<
  Exclude<OrderStatusColorKey, "COMPLETED" | "CANCELED">,
  string
> = {
  NEW: "border-blue-500 bg-blue-100 ring-2 ring-blue-500/50 shadow-md",
  CONFIRMED: "border-purple-500 bg-purple-100 ring-2 ring-purple-500/50 shadow-md",
  PREPARING: "border-orange-500 bg-orange-100 ring-2 ring-orange-500/50 shadow-md",
  READY_FOR_PICKUP: "border-green-600 bg-green-100 ring-2 ring-green-600/50 shadow-md",
  OUT_FOR_DELIVERY: "border-cyan-500 bg-cyan-100 ring-2 ring-cyan-500/50 shadow-md",
};

/**
 * Kitchen desktop board columns.
 * READY combines pickup-ready + out-for-delivery and keeps green as the action color.
 */
export const KITCHEN_COLUMN_STATUS_HEADER_CLASS: Record<
  "NEW" | "CONFIRMED" | "PREPARING" | "READY",
  string
> = {
  NEW: ORDER_STATUS_BADGE_BORDERED_CLASS.NEW,
  CONFIRMED: ORDER_STATUS_BADGE_BORDERED_CLASS.CONFIRMED,
  PREPARING: ORDER_STATUS_BADGE_BORDERED_CLASS.PREPARING,
  READY: ORDER_STATUS_BADGE_BORDERED_CLASS.READY_FOR_PICKUP,
};

/** Solid accent dots (optional indicators). */
export const ORDER_STATUS_DOT_CLASS: Record<OrderStatusColorKey, string> = {
  NEW: "bg-blue-500",
  CONFIRMED: "bg-purple-500",
  PREPARING: "bg-orange-500",
  READY_FOR_PICKUP: "bg-green-600",
  OUT_FOR_DELIVERY: "bg-cyan-500",
  COMPLETED: "bg-slate-400",
  CANCELED: "bg-red-500",
};

export function isOrderStatusColorKey(status: string): status is OrderStatusColorKey {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

export function orderStatusBadgeClass(status: string): string {
  return isOrderStatusColorKey(status)
    ? ORDER_STATUS_BADGE_CLASS[status]
    : "bg-muted text-muted-foreground";
}

export function orderStatusBadgeBorderedClass(status: string): string {
  return isOrderStatusColorKey(status)
    ? ORDER_STATUS_BADGE_BORDERED_CLASS[status]
    : "bg-muted text-muted-foreground border-border";
}
