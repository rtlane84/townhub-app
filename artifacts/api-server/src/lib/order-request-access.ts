import type { Request } from "express";
import type { UserRole } from "./order-access";
import { verifyOrderAccessToken } from "./order-access-token";
import {
  authorizeOrderView,
  type OrderViewAuthInput,
} from "./order-customer-access";

export function extractOrderAccessToken(req: Request): string | null {
  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  const headerToken = req.get("X-Order-Access-Token");
  if (headerToken?.trim()) {
    return headerToken.trim();
  }

  return null;
}

export function authorizeOrderAccess(
  input: OrderViewAuthInput & {
    orderId: number;
    accessToken?: string | null;
  },
) {
  const { orderId, accessToken, ...rest } = input;
  const tokenValid = verifyOrderAccessToken(orderId, accessToken);
  return authorizeOrderView({
    ...rest,
    hasValidAccessToken: tokenValid,
  });
}

export type OrderAccessContext = {
  viewerUserId: string | null | undefined;
  viewerRole: UserRole | null | undefined;
  businessOwnerId: string | null | undefined;
  orderCustomerUserId: string | null | undefined;
  accessToken: string | null;
};

export function buildOrderAccessInput(
  orderId: number,
  orderCustomerUserId: string | null,
  ctx: OrderAccessContext,
): OrderViewAuthInput & { orderId: number; accessToken?: string | null } {
  return {
    orderId,
    viewerUserId: ctx.viewerUserId,
    viewerRole: ctx.viewerRole,
    businessOwnerId: ctx.businessOwnerId,
    orderCustomerUserId,
    accessToken: ctx.accessToken,
  };
}
