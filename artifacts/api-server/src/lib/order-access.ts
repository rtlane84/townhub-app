export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "ADMIN";

export type OrderStatusUpdateAuthInput = {
  userId: string;
  userRole: UserRole | null | undefined;
  businessOwnerId: string | null | undefined;
};

export type OrderStatusUpdateAuthResult =
  | { allowed: true }
  | { allowed: false; statusCode: 403; error: string };

/**
 * Returns whether the caller may update an order's status.
 * Admins may update any order; business owners only their own business's orders.
 */
export function authorizeOrderStatusUpdate(
  input: OrderStatusUpdateAuthInput,
): OrderStatusUpdateAuthResult {
  if (!input.userRole) {
    return {
      allowed: false,
      statusCode: 403,
      error: "Forbidden: user not found",
    };
  }

  if (input.userRole === "ADMIN") {
    return { allowed: true };
  }

  if (input.userRole !== "BUSINESS_OWNER") {
    return {
      allowed: false,
      statusCode: 403,
      error: "Forbidden: business owner access required",
    };
  }

  if (!input.businessOwnerId || input.businessOwnerId !== input.userId) {
    return {
      allowed: false,
      statusCode: 403,
      error: "Forbidden: you do not own the business for this order",
    };
  }

  return { allowed: true };
}
