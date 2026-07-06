import type { AppointmentRequest, Order } from "@workspace/api-client-react";
import {
  isBusinessHubAppointmentLivePage,
  isBusinessHubOrderLivePage,
} from "./business-hub-features.ts";
import { businessOrderDetailPath } from "./business-order-list-url.ts";

export const OWNER_NOTIFICATION_TOAST_DURATION_MS = 6_000;

export type OwnerDashboardSseStatus =
  | "disconnected"
  | "connecting"
  | "live"
  | "reconnecting"
  | "fallback";

export const BUSINESS_HUB_APPOINTMENTS_PATH = "/dashboard/business/appointments";
export const BUSINESS_HUB_ORDERS_PATH = "/dashboard/business/orders";

export function shouldShowOrderNotificationBanner(pathname: string): boolean {
  return !isBusinessHubOrderLivePage(pathname);
}

export function shouldShowAppointmentNotificationBanner(pathname: string): boolean {
  return !isBusinessHubAppointmentLivePage(pathname);
}

/** Non-live Business Hub pages always poll; live pages poll only when SSE is unavailable. */
export function shouldUseOwnerDashboardPolling(
  routeNeedsLiveEvents: boolean,
  sseStatus: OwnerDashboardSseStatus,
  shouldConnectSse: boolean,
  eventSourceSupported = true,
): boolean {
  if (!routeNeedsLiveEvents) return true;
  if (!eventSourceSupported) return true;
  if (sseStatus === "fallback") return true;
  if (sseStatus === "disconnected" && !shouldConnectSse) return true;
  return false;
}

export function resolveOrderDetailPath(orderId: number): string {
  return businessOrderDetailPath(orderId);
}

export function mergePendingOrders(existing: Order[], incoming: Order[]): Order[] {
  const byId = new Map<number, Order>();
  for (const order of existing) byId.set(order.id, order);
  for (const order of incoming) byId.set(order.id, order);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

export function mergePendingAppointments(
  existing: AppointmentRequest[],
  incoming: AppointmentRequest[],
): AppointmentRequest[] {
  const byId = new Map<number, AppointmentRequest>();
  for (const request of existing) byId.set(request.id, request);
  for (const request of incoming) byId.set(request.id, request);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}
