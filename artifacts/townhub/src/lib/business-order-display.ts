import { differenceInMinutes, format, isSameDay, subDays } from "date-fns";
import type { Order } from "@workspace/api-client-react";

export type BusinessOrderPaymentFlag = "PAID" | "PENDING" | "PAY AT PICKUP" | "REFUNDED" | "FAILED";

export const QUEUE_SUMMARY_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

export type QueueSummaryStatus = (typeof QUEUE_SUMMARY_STATUSES)[number];

export const QUEUE_SUMMARY_LABELS: Record<QueueSummaryStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
};

export const PAYMENT_FLAG_LABELS: Record<BusinessOrderPaymentFlag, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  "PAY AT PICKUP": "Pay at pickup",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

/** Semantic dot colors for outline-style payment tags (secondary to status pills). */
export const PAYMENT_FLAG_DOT_STYLES: Record<BusinessOrderPaymentFlag, string> = {
  PAID: "bg-emerald-500",
  PENDING: "bg-amber-500",
  "PAY AT PICKUP": "bg-slate-400",
  REFUNDED: "bg-violet-500",
  FAILED: "bg-red-500",
};

export const PAYMENT_FLAG_BADGE_BASE =
  "inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-normal leading-none text-muted-foreground shadow-sm";

export function formatOrderRelativeTime(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const minutesAgo = differenceInMinutes(now, date);
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  if (isSameDay(date, now)) return `Today ${format(date, "h:mm a")}`;
  if (isSameDay(date, subDays(now, 1))) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

export function getBusinessOrderPaymentFlag(
  paymentMethod?: string,
  paymentStatus?: string,
): BusinessOrderPaymentFlag {
  const status = paymentStatus?.trim().toUpperCase();
  if (status === "FAILED") return "FAILED";
  if (status === "REFUNDED") return "REFUNDED";
  if (paymentMethod === "IN_PERSON") return "PAY AT PICKUP";
  if (status === "PAID") return "PAID";
  return "PENDING";
}

export function customerPhoneTelHref(phone: string): string {
  const normalized = phone.trim().replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "";
}

export function computeQueueCounts(orders: Order[]): Record<QueueSummaryStatus, number> {
  const counts: Record<QueueSummaryStatus, number> = {
    NEW: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    READY_FOR_PICKUP: 0,
    OUT_FOR_DELIVERY: 0,
  };

  for (const order of orders) {
    const status = order.status as QueueSummaryStatus;
    if (status in counts) {
      counts[status] += 1;
    }
  }

  return counts;
}

export function fulfillmentLabel(type: string): string {
  if (type === "PICKUP") return "Pickup";
  if (type === "DELIVERY") return "Delivery";
  return type.replace(/_/g, " ");
}
