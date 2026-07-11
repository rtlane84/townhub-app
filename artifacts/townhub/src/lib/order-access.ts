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

export type CheckoutIntentResult = {
  url: string | null;
  sessionId?: string | null;
  mockMode?: boolean;
  pendingCheckoutId: number;
  accessToken: string;
  orderId?: number;
  orderAccessToken?: string;
};

/** Start Stripe checkout without creating an order until payment succeeds. */
export async function createCheckoutIntent(
  body: Record<string, unknown>,
  authToken?: string | null,
): Promise<CheckoutIntentResult> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(resolveApiUrl("/api/checkout/intents"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Could not start checkout");
  }

  return response.json() as Promise<CheckoutIntentResult>;
}

export type ConfirmPendingCheckoutResult = Order & {
  accessToken?: string;
  pendingCheckoutId?: number;
  orderId?: number;
};

/**
 * Ask the API to materialize a PAID order from a pending checkout (webhook safety net).
 */
export async function confirmPendingCheckoutPayment(
  pendingCheckoutId: number,
  accessToken?: string | null,
  authToken?: string | null,
): Promise<ConfirmPendingCheckoutResult> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(resolveApiUrl("/api/checkout/confirm"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      pendingCheckoutId,
      ...(accessToken?.trim() ? { accessToken: accessToken.trim() } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Payment not confirmed yet");
  }

  const data = (await response.json()) as ConfirmPendingCheckoutResult;
  return {
    ...data,
    orderId: data.id,
  };
}
