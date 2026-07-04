import type { UserRole } from "./order-access";

export type OrderViewAuthInput = {
  viewerUserId: string | null | undefined;
  viewerRole: UserRole | null | undefined;
  businessOwnerId: string | null | undefined;
  orderCustomerUserId: string | null | undefined;
  hasValidAccessToken?: boolean;
};

export type OrderViewAuthResult =
  | { allowed: true }
  | { allowed: false; statusCode: 403; error: string };

/**
 * Guest orders require a valid signed access token unless the viewer is admin,
 * the business owner, or the linked customer.
 */
export function authorizeOrderView(input: OrderViewAuthInput): OrderViewAuthResult {
  if (input.viewerRole === "ADMIN") {
    return { allowed: true };
  }

  if (
    input.viewerRole === "BUSINESS_OWNER" &&
    input.businessOwnerId &&
    input.viewerUserId === input.businessOwnerId
  ) {
    return { allowed: true };
  }

  if (input.orderCustomerUserId) {
    if (input.viewerUserId && input.viewerUserId === input.orderCustomerUserId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      statusCode: 403,
      error: "Forbidden: you do not have access to this order",
    };
  }

  if (input.hasValidAccessToken) {
    return { allowed: true };
  }

  return {
    allowed: false,
    statusCode: 403,
    error: "Forbidden: valid order access token required",
  };
}
