import { businessHasFeature } from "./business-features";
import { SUBSCRIPTION_FEATURE_KEYS } from "./subscription-feature-keys";
import {
  APPOINTMENT_REQUESTS_LOCKED_MESSAGE,
  ONLINE_ORDERING_LOCKED_MESSAGE,
} from "./business-commerce-eligibility";

export {
  BUSINESS_NOT_ACCEPTING_ORDERS_MESSAGE,
  ONLINE_ORDERING_LOCKED_MESSAGE,
  APPOINTMENT_REQUESTS_LOCKED_MESSAGE,
  isBusinessOpenForPublicCommerce,
  evaluateBusinessOrderingAvailability,
} from "./business-commerce-eligibility";

export async function requireOnlineOrderingFeature(
  businessId: number,
): Promise<{ ok: true } | { ok: false; status: 403; error: string }> {
  const enabled = await businessHasFeature(
    businessId,
    SUBSCRIPTION_FEATURE_KEYS.ONLINE_ORDERING,
  );
  if (!enabled) {
    return { ok: false, status: 403, error: ONLINE_ORDERING_LOCKED_MESSAGE };
  }
  return { ok: true };
}

export async function requireAppointmentRequestsFeature(
  businessId: number,
): Promise<{ ok: true } | { ok: false; status: 403; error: string }> {
  const enabled = await businessHasFeature(
    businessId,
    SUBSCRIPTION_FEATURE_KEYS.APPOINTMENT_REQUESTS,
  );
  if (!enabled) {
    return { ok: false, status: 403, error: APPOINTMENT_REQUESTS_LOCKED_MESSAGE };
  }
  return { ok: true };
}
