import { formatTime12h } from "./time";

/** Fallback when a business has no default prep time configured. */
export const FALLBACK_DEFAULT_PREP_MINUTES = 15;

/** Extra minutes added for delivery fulfillment. */
export const DELIVERY_PREP_BUFFER_MINUTES = 15;

/** Half-width of the friendly minute range shown to customers (e.g. 30 → 25–35). */
export const PREP_WINDOW_HALF_WIDTH_MINUTES = 5;

export type PrepEstimateItem = {
  quantity: number;
  prepTimeMinutes?: number | null;
};

export type CalculateAsapPrepEstimateInput = {
  defaultPrepMinutes?: number | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
  items: PrepEstimateItem[];
  orderedAt?: Date;
};

export type AsapPrepEstimate = {
  /** Rounded center minutes from order time. */
  centerMinutes: number;
  /** Lower bound minutes from order time. */
  minMinutes: number;
  /** Upper bound minutes from order time. */
  maxMinutes: number;
  estimatedWindowStart: Date;
  estimatedWindowEnd: Date;
};

function resolveItemPrepMinutes(item: PrepEstimateItem): number {
  if (item.prepTimeMinutes == null || item.prepTimeMinutes <= 0) return 0;
  return item.prepTimeMinutes;
}

function quantityBufferMinutes(items: PrepEstimateItem[]): number {
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const extraUnits = Math.max(0, totalUnits - 1);
  const extraLines = Math.max(0, items.length - 1);
  // Small bump for volume without summing every item prep time.
  return Math.min(8, extraUnits + extraLines);
}

/** Server-authoritative ASAP prep estimate for pickup or delivery. */
export function calculateAsapPrepEstimate(
  input: CalculateAsapPrepEstimateInput,
): AsapPrepEstimate {
  const orderedAt = input.orderedAt ?? new Date();
  const defaultPrep = input.defaultPrepMinutes ?? FALLBACK_DEFAULT_PREP_MINUTES;
  const maxItemPrep = input.items.reduce(
    (max, item) => Math.max(max, resolveItemPrepMinutes(item)),
    0,
  );
  const basePrep = Math.max(defaultPrep, maxItemPrep);
  const quantityBuffer = quantityBufferMinutes(input.items);
  const deliveryBuffer =
    input.fulfillmentType === "DELIVERY" ? DELIVERY_PREP_BUFFER_MINUTES : 0;
  const rawCenter = basePrep + quantityBuffer + deliveryBuffer;
  const centerMinutes = Math.max(
    PREP_WINDOW_HALF_WIDTH_MINUTES,
    Math.round(rawCenter / 5) * 5,
  );
  const minMinutes = Math.max(5, centerMinutes - PREP_WINDOW_HALF_WIDTH_MINUTES);
  const maxMinutes = centerMinutes + PREP_WINDOW_HALF_WIDTH_MINUTES;

  return {
    centerMinutes,
    minMinutes,
    maxMinutes,
    estimatedWindowStart: new Date(orderedAt.getTime() + minMinutes * 60_000),
    estimatedWindowEnd: new Date(orderedAt.getTime() + maxMinutes * 60_000),
  };
}

export function formatPrepMinutesRange(minMinutes: number, maxMinutes: number): string {
  return `${minMinutes}–${maxMinutes} minutes`;
}

function formatClockTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return formatTime12h(`${hh}:${mm}`);
}

export function formatEstimatedWindowClockRange(
  windowStart: Date | string,
  windowEnd: Date | string,
): string {
  const start = typeof windowStart === "string" ? new Date(windowStart) : windowStart;
  const end = typeof windowEnd === "string" ? new Date(windowEnd) : windowEnd;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${formatClockTime(start)}–${formatClockTime(end)}`;
}

export function fulfillmentTimingNoun(fulfillmentType: string): "pickup" | "delivery" {
  return fulfillmentType === "DELIVERY" ? "delivery" : "pickup";
}

export function formatCheckoutAsapEstimateLabel(
  fulfillmentType: string,
  minMinutes: number,
  maxMinutes: number,
): string {
  const noun = fulfillmentTimingNoun(fulfillmentType);
  return `ASAP · Estimated ${noun} ${formatPrepMinutesRange(minMinutes, maxMinutes)}`;
}

export function formatCustomerEstimatedWindowLabel(
  fulfillmentType: string,
  windowStart: Date | string,
  windowEnd: Date | string,
): string {
  const noun = fulfillmentTimingNoun(fulfillmentType);
  const range = formatEstimatedWindowClockRange(windowStart, windowEnd);
  if (!range) return "ASAP";
  const capitalized = noun.charAt(0).toUpperCase() + noun.slice(1);
  return `Estimated ${capitalized.toLowerCase()}: ${range}`;
}

export function formatBusinessReadyWindowLabel(
  fulfillmentType: string,
  windowStart: Date | string,
  windowEnd: Date | string,
): string {
  const range = formatEstimatedWindowClockRange(windowStart, windowEnd);
  if (!range) return "ASAP";
  const noun = fulfillmentTimingNoun(fulfillmentType);
  return `ASAP · Ready around ${range}`;
}

export type OrderTimingStatus =
  | { kind: "due"; minutes: number }
  | { kind: "overdue"; minutes: number }
  | { kind: "none" };

export function getOrderTimingStatus(
  windowEnd: Date | string | null | undefined,
  now: Date = new Date(),
  active = true,
): OrderTimingStatus {
  if (!active || !windowEnd) return { kind: "none" };
  const end = typeof windowEnd === "string" ? new Date(windowEnd) : windowEnd;
  if (Number.isNaN(end.getTime())) return { kind: "none" };

  const diffMs = end.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes >= 0) {
    return { kind: "due", minutes: diffMinutes };
  }
  return { kind: "overdue", minutes: Math.abs(diffMinutes) };
}

export function formatOrderTimingStatusLabel(status: OrderTimingStatus): string | null {
  if (status.kind === "none") return null;
  if (status.kind === "due") {
    if (status.minutes < 1) return "Due now";
    return `Due in ${status.minutes} min`;
  }
  if (status.minutes < 1) return "Overdue";
  return `Overdue by ${status.minutes} min`;
}

export function formatNotificationEstimatedWindow(
  fulfillmentType: string,
  windowStart: Date | string,
  windowEnd: Date | string,
): string {
  const noun = fulfillmentTimingNoun(fulfillmentType);
  const range = formatEstimatedWindowClockRange(windowStart, windowEnd);
  if (!range) return "ASAP";
  return `Estimated ${noun}: ${range}`;
}
