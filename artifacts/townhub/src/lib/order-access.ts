import type { Order } from "@workspace/api-client-react";
import { resolveApiUrl } from "./api-base-url.ts";

export function buildOrderAccessQuery(token: string | null | undefined): string {
  if (!token?.trim()) return "";
  return `?token=${encodeURIComponent(token.trim())}`;
}

export function orderConfirmationPath(orderId: number, accessToken?: string | null): string {
  return `/order/${orderId}${buildOrderAccessQuery(accessToken)}`;
}

export async function fetchOrderById(
  orderId: number,
  accessToken?: string | null,
  authToken?: string | null,
): Promise<Order> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    resolveApiUrl(`/api/orders/${orderId}${buildOrderAccessQuery(accessToken)}`),
    { credentials: "include", headers },
  );

  if (!response.ok) {
    throw new Error("Order not found");
  }

  return response.json() as Promise<Order>;
}
