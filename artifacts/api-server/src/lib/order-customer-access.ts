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
 * Who may view an order:
 * - Admin / business owner
 * - Linked customer (signed-in as the same Clerk user)
 * - Anyone with a valid signed access token (guest checkout + Stripe success URL,
 *   including when the order was placed while signed in — Safari / Capacitor Browser
 *   often has no Clerk session on return)
 *
 * A valid token does not grant access to a different signed-in user who is not
 * the linked customer (possession of the URL is enough for anonymous viewers).
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

  // Stripe success_url always includes ?token= — allow it even when the order is
  // linked to a Clerk user (native/system browser return has no session).
  if (input.hasValidAccessToken) {
    if (
      input.viewerUserId &&
      input.orderCustomerUserId &&
      input.viewerUserId !== input.orderCustomerUserId
    ) {
      return {
        allowed: false,
        statusCode: 403,
        error: "Forbidden: you do not have access to this order",
      };
    }
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

  return {
    allowed: false,
    statusCode: 403,
    error: "Forbidden: valid order access token required",
  };
}
