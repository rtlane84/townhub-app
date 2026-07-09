import { resolveApiUrl } from "./api-base-url.ts";
import type { BusinessLiveEventPayload, BusinessLiveEventType } from "./business-live-event-types";

export type { BusinessLiveEventPayload, BusinessLiveEventType };

export function buildBusinessLiveEventsUrl(businessId: number, token?: string | null): string {
  const base = `/api/businesses/${businessId}/live-events`;
  const path = !token?.trim()
    ? base
    : `${base}?${new URLSearchParams({ token: token.trim() }).toString()}`;
  return resolveApiUrl(path);
}

export const SSE_MAX_RECONNECT_ATTEMPTS = 5;
export const SSE_RECONNECT_BASE_MS = 1_000;
export const SSE_RECONNECT_MAX_MS = 30_000;

export function sseReconnectDelayMs(attempt: number): number {
  const exponential = SSE_RECONNECT_BASE_MS * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential, SSE_RECONNECT_MAX_MS);
}

export function isEventSourceSupported(): boolean {
  return typeof fetch !== "undefined" && typeof ReadableStream !== "undefined";
}
