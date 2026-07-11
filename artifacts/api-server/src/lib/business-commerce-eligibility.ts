import {
  evaluateOrderingAvailability,
  type FoodTruckLocationWindow,
  type OrderingAvailabilityResult,
} from "@workspace/api-zod";

export const BUSINESS_NOT_ACCEPTING_ORDERS_MESSAGE =
  "This business is not accepting orders right now.";
export const ONLINE_ORDERING_LOCKED_MESSAGE =
  "Online ordering is not available for this business.";
export const APPOINTMENT_REQUESTS_LOCKED_MESSAGE =
  "This business is not accepting appointment requests.";

export function isBusinessOpenForPublicCommerce(business: {
  active: boolean;
  archivedAt?: Date | string | null;
}): boolean {
  return business.active && business.archivedAt == null;
}

export type OrderingEligibilityBusiness = {
  active: boolean;
  archivedAt?: Date | string | null;
  orderingAvailabilityMode?: string | null;
  orderingEnabled?: boolean | null;
  structuredHours?: unknown;
  orderClosingBufferMinutes?: number | null;
};

/**
 * Full ordering availability check including hours / mobile schedule / manual toggle.
 * Pass mobileLocations when mode is MOBILE_LOCATION_SCHEDULE.
 */
export function evaluateBusinessOrderingAvailability(
  business: OrderingEligibilityBusiness,
  options?: {
    mobileLocations?: FoodTruckLocationWindow[];
    now?: Date;
  },
): OrderingAvailabilityResult {
  return evaluateOrderingAvailability(
    {
      active: business.active,
      archivedAt: business.archivedAt,
      orderingAvailabilityMode: business.orderingAvailabilityMode,
      orderingEnabled: business.orderingEnabled,
      structuredHours: business.structuredHours,
      mobileLocations: options?.mobileLocations,
      orderClosingBufferMinutes: business.orderClosingBufferMinutes,
    },
    options?.now,
  );
}
