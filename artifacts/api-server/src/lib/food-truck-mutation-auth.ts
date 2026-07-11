import type { BusinessAccessResult } from "./business-access";

export type FoodTruckMutationAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Validates caller auth and (for PUT/DELETE) that a location belongs to the
 * business id in the route. Returns 404 when the location is missing or belongs
 * to another business so ids cannot be probed across tenants.
 */
export function authorizeFoodTruckLocationMutation(input: {
  isAuthenticated: boolean;
  businessAccess: BusinessAccessResult;
  requestedBusinessId: number;
  existingLocation?: { businessId: number } | null;
}): FoodTruckMutationAuthResult {
  if (!input.isAuthenticated) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!input.businessAccess.ok) {
    return {
      ok: false,
      status: input.businessAccess.status === 404 ? 404 : 403,
      error: input.businessAccess.error,
    };
  }

  if (input.existingLocation !== undefined) {
    if (
      !input.existingLocation ||
      input.existingLocation.businessId !== input.requestedBusinessId
    ) {
      return { ok: false, status: 404, error: "Location not found" };
    }
  }

  return { ok: true };
}
