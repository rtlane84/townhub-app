import { format } from "date-fns";
import type { Order, OrderStatus } from "@workspace/api-client-react";

const ACTIVE_TIMING_STATUSES = new Set<OrderStatus>([
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
]);

function fulfillmentNoun(fulfillmentType: string): "pickup" | "delivery" {
  return fulfillmentType === "DELIVERY" ? "delivery" : "pickup";
}

function formatClockRange(windowStart: string, windowEnd: string): string {
  const start = new Date(windowStart);
  const end = new Date(windowEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${format(start, "h:mm")}–${format(end, "h:mm a")}`;
}

export function isActiveOrderForTiming(status: OrderStatus | string): boolean {
  return ACTIVE_TIMING_STATUSES.has(status as OrderStatus);
}

export function getCheckoutAsapLabel(
  fulfillmentType: string,
  minMinutes: number,
  maxMinutes: number,
): string {
  const noun = fulfillmentNoun(fulfillmentType);
  return `ASAP · Estimated ${noun} ${minMinutes}–${maxMinutes} minutes`;
}

export function getCustomerEstimatedWindowLabel(order: Pick<
  Order,
  "fulfillmentType" | "estimatedWindowStart" | "estimatedWindowEnd"
>): string {
  if (!order.estimatedWindowStart || !order.estimatedWindowEnd) return "ASAP";
  const range = formatClockRange(order.estimatedWindowStart, order.estimatedWindowEnd);
  if (!range) return "ASAP";
  const noun = fulfillmentNoun(order.fulfillmentType);
  return `Estimated ${noun}: ${range}`;
}

export function getBusinessReadyWindowLabel(order: Pick<
  Order,
  "fulfillmentType" | "estimatedWindowStart" | "estimatedWindowEnd"
>): string {
  if (!order.estimatedWindowStart || !order.estimatedWindowEnd) return "ASAP";
  const range = formatClockRange(order.estimatedWindowStart, order.estimatedWindowEnd);
  if (!range) return "ASAP";
  return `ASAP · Ready around ${range}`;
}

export function getBusinessOrderTimingLabel(
  order: Pick<Order, "status" | "estimatedWindowEnd">,
  now: Date = new Date(),
): string | null {
  if (!isActiveOrderForTiming(order.status) || !order.estimatedWindowEnd) return null;

  const end = new Date(order.estimatedWindowEnd);
  if (Number.isNaN(end.getTime())) return null;

  const diffMinutes = Math.round((end.getTime() - now.getTime()) / 60_000);
  if (diffMinutes >= 0) {
    if (diffMinutes < 1) return "Due now";
    return `Due in ${diffMinutes} min`;
  }
  const overdueMinutes = Math.abs(diffMinutes);
  if (overdueMinutes < 1) return "Overdue";
  return `Overdue by ${overdueMinutes} min`;
}
