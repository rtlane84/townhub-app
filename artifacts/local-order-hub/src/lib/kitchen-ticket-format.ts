import type { Order } from "@workspace/api-client-react";
import { getBusinessOrderPaymentFlag, PAYMENT_FLAG_LABELS, fulfillmentLabel } from "./business-order-display.ts";

export function formatKitchenTicketTime(createdAt: string | undefined): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatKitchenPaymentStatus(order: Pick<Order, "paymentMethod" | "paymentStatus">): string {
  const flag = getBusinessOrderPaymentFlag(order.paymentMethod, order.paymentStatus);
  return PAYMENT_FLAG_LABELS[flag];
}

export function formatKitchenFulfillment(order: Pick<Order, "fulfillmentType" | "deliveryAddress" | "pickupTime">): string {
  const base = fulfillmentLabel(order.fulfillmentType);
  if (order.fulfillmentType === "DELIVERY" && order.deliveryAddress?.trim()) {
    return `${base} — ${order.deliveryAddress.trim()}`;
  }
  if (order.pickupTime?.trim()) {
    return `${base} — ${order.pickupTime.trim()}`;
  }
  return base;
}

/** Human-readable lines from order.specialFields JSON when present. */
export function parseKitchenSpecialFields(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return [parsed.trim()].filter(Boolean);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, value]) => {
          if (value == null || value === "") return null;
          const label = key.replace(/_/g, " ");
          return `${label}: ${String(value)}`;
        })
        .filter((line): line is string => Boolean(line));
    }
  } catch {
    return [raw.trim()];
  }
  return [raw.trim()];
}
