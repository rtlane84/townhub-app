import { isOpenNow, parseStructuredHours, type DayHoursInput } from "./business-hours";

export const ORDERING_AVAILABILITY_MODES = [
  "ALWAYS",
  "BUSINESS_HOURS",
  "MOBILE_LOCATION_SCHEDULE",
  "MANUAL",
] as const;

export type OrderingAvailabilityMode = (typeof ORDERING_AVAILABILITY_MODES)[number];

export const DEFAULT_ORDERING_AVAILABILITY_MODE: OrderingAvailabilityMode = "ALWAYS";

/** Default: order until the exact close/end time. */
export const DEFAULT_ORDER_CLOSING_BUFFER_MINUTES = 0;

/** Upper bound for owner-configured closing buffer (4 hours). */
export const MAX_ORDER_CLOSING_BUFFER_MINUTES = 240;

/**
 * Ordering windows use the same local civil clock as structured hours and mobile
 * stop times (`Date#getHours` / `getDay` / local YYYY-MM-DD). There is no
 * per-business timezone column yet — keep API host TZ aligned with the town.
 *
 * Overnight hours (close/end <= open/start) remain unsupported and count as closed.
 */
export function isOrderingAvailabilityMode(value: unknown): value is OrderingAvailabilityMode {
  return (
    typeof value === "string" &&
    (ORDERING_AVAILABILITY_MODES as readonly string[]).includes(value)
  );
}

export function resolveOrderingAvailabilityMode(
  business: { orderingAvailabilityMode?: string | null },
): OrderingAvailabilityMode {
  if (isOrderingAvailabilityMode(business.orderingAvailabilityMode)) {
    return business.orderingAvailabilityMode;
  }
  return DEFAULT_ORDERING_AVAILABILITY_MODE;
}

/** Normalize owner buffer; blank/null/invalid → 0. Clamped to [0, MAX]. */
export function resolveOrderClosingBufferMinutes(value: unknown): number {
  if (value == null || value === "") return DEFAULT_ORDER_CLOSING_BUFFER_MINUTES;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ORDER_CLOSING_BUFFER_MINUTES;
  return Math.min(MAX_ORDER_CLOSING_BUFFER_MINUTES, Math.max(0, Math.floor(n)));
}

export type FoodTruckLocationWindow = {
  locationDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean | null;
};

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseHmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * True when a scheduled mobile location is active for the given instant.
 * Optional closingBufferMinutes ends ordering that many minutes before endTime.
 * Stops without an endTime are unaffected by the buffer (whole-day / open-ended).
 */
export function hasActiveMobileLocationNow(
  locations: FoodTruckLocationWindow[],
  now = new Date(),
  closingBufferMinutes = 0,
): boolean {
  const today = toLocalDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const buffer = resolveOrderClosingBufferMinutes(closingBufferMinutes);

  return locations.some((loc) => {
    if (loc.isActive === false) return false;
    if (loc.locationDate !== today) return false;

    const start = loc.startTime ? parseHmToMinutes(loc.startTime) : null;
    const end = loc.endTime ? parseHmToMinutes(loc.endTime) : null;

    // No time window → whole day counts as available (no end to buffer against).
    if (start == null && end == null) return true;
    if (start != null && end == null) return currentMinutes >= start;
    if (start == null && end != null) {
      const effectiveEnd = end - buffer;
      return currentMinutes < effectiveEnd;
    }
    if (start != null && end != null) {
      if (end <= start) return false;
      const effectiveEnd = end - buffer;
      if (effectiveEnd <= start) return false;
      return currentMinutes >= start && currentMinutes < effectiveEnd;
    }
    return false;
  });
}

export type OrderingAvailabilityInput = {
  active: boolean;
  archivedAt?: Date | string | null;
  orderingAvailabilityMode?: string | null;
  /** MANUAL mode: owner toggle. Defaults to true when unset. */
  orderingEnabled?: boolean | null;
  structuredHours?: DayHoursInput[] | unknown | null;
  mobileLocations?: FoodTruckLocationWindow[];
  /**
   * Minutes before today's close / active stop end when new ASAP orders stop.
   * Only applied for BUSINESS_HOURS and MOBILE_LOCATION_SCHEDULE. 0 = until exact end.
   */
  orderClosingBufferMinutes?: number | null;
};

export type OrderingAvailabilityResult = {
  available: boolean;
  mode: OrderingAvailabilityMode;
  reason: string | null;
};

export const ORDERING_UNAVAILABLE_MESSAGES = {
  inactive: "This business is not accepting orders right now.",
  businessHours: "This business is currently closed. Ordering is only available during business hours.",
  mobileLocation:
    "This business is not at an active scheduled location right now. Ordering is unavailable.",
  manualOff: "This business has temporarily turned off online ordering.",
  closingEnded: "Online ordering has ended for today.",
} as const;

/**
 * Evaluates whether a business is accepting online orders under its availability mode.
 * Does not check subscription features — callers gate those separately.
 */
export function evaluateOrderingAvailability(
  business: OrderingAvailabilityInput,
  now = new Date(),
): OrderingAvailabilityResult {
  const mode = resolveOrderingAvailabilityMode(business);

  if (!business.active || business.archivedAt != null) {
    return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.inactive };
  }

  switch (mode) {
    case "ALWAYS":
      return { available: true, mode, reason: null };

    case "MANUAL": {
      const enabled = business.orderingEnabled !== false;
      return enabled
        ? { available: true, mode, reason: null }
        : { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.manualOff };
    }

    case "BUSINESS_HOURS": {
      const hours =
        parseStructuredHours(business.structuredHours) ??
        (Array.isArray(business.structuredHours)
          ? (business.structuredHours as DayHoursInput[])
          : null);
      if (!hours || !isOpenNow(hours, now, 0)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.businessHours };
      }
      const buffer = resolveOrderClosingBufferMinutes(business.orderClosingBufferMinutes);
      if (!isOpenNow(hours, now, buffer)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.closingEnded };
      }
      return { available: true, mode, reason: null };
    }

    case "MOBILE_LOCATION_SCHEDULE": {
      const locations = business.mobileLocations ?? [];
      if (!hasActiveMobileLocationNow(locations, now, 0)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.mobileLocation };
      }
      const buffer = resolveOrderClosingBufferMinutes(business.orderClosingBufferMinutes);
      if (!hasActiveMobileLocationNow(locations, now, buffer)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.closingEnded };
      }
      return { available: true, mode, reason: null };
    }

    default:
      return { available: true, mode: "ALWAYS", reason: null };
  }
}
