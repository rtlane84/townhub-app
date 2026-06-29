import type { UserRole } from "./order-access";

export type OrderViewAuthInput = {
  viewerUserId: string | null | undefined;
  viewerRole: UserRole | null | undefined;
  businessOwnerId: string | null | undefined;
  orderCustomerUserId: string | null | undefined;
};

export type OrderViewAuthResult =
  | { allowed: true }
  | { allowed: false; statusCode: 403; error: string };

/**
 * Guest orders (no customerUserId) remain viewable by id for the confirmation flow.
 * Account-linked orders are visible only to the owning customer, business owner, or admin.
 */
export function authorizeOrderView(input: OrderViewAuthInput): OrderViewAuthResult {
  if (!input.orderCustomerUserId) {
    return { allowed: true };
  }

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

  if (input.viewerUserId && input.viewerUserId === input.orderCustomerUserId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    statusCode: 403,
    error: "Forbidden: you do not have access to this order",
  };
}
