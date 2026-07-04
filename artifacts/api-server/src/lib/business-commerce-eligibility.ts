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
