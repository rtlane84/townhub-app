import { isOpenNow, parseStructuredHours, type DayHoursInput } from "./business-hours";

export const ORDERING_AVAILABILITY_MODES = [
  "ALWAYS",
  "BUSINESS_HOURS",
  "MOBILE_LOCATION_SCHEDULE",
  "MANUAL",
] as const;

export type OrderingAvailabilityMode = (typeof ORDERING_AVAILABILITY_MODES)[number];

export const DEFAULT_ORDERING_AVAILABILITY_MODE: OrderingAvailabilityMode = "ALWAYS";

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

/** True when a scheduled mobile location is active for the given instant. */
export function hasActiveMobileLocationNow(
  locations: FoodTruckLocationWindow[],
  now = new Date(),
): boolean {
  const today = toLocalDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return locations.some((loc) => {
    if (loc.isActive === false) return false;
    if (loc.locationDate !== today) return false;

    const start = loc.startTime ? parseHmToMinutes(loc.startTime) : null;
    const end = loc.endTime ? parseHmToMinutes(loc.endTime) : null;

    // No time window → whole day counts as available.
    if (start == null && end == null) return true;
    if (start != null && end == null) return currentMinutes >= start;
    if (start == null && end != null) return currentMinutes < end;
    if (start != null && end != null) {
      if (end <= start) return false;
      return currentMinutes >= start && currentMinutes < end;
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
      if (!hours || !isOpenNow(hours, now)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.businessHours };
      }
      return { available: true, mode, reason: null };
    }

    case "MOBILE_LOCATION_SCHEDULE": {
      const locations = business.mobileLocations ?? [];
      if (!hasActiveMobileLocationNow(locations, now)) {
        return { available: false, mode, reason: ORDERING_UNAVAILABLE_MESSAGES.mobileLocation };
      }
      return { available: true, mode, reason: null };
    }

    default:
      return { available: true, mode: "ALWAYS", reason: null };
  }
}
