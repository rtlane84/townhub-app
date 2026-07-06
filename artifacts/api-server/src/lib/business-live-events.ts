/**
 * In-process live event bus for Business Hub SSE (beta / single-instance).
 *
 * Multi-instance production requires a shared bus (Redis pub/sub, Postgres
 * LISTEN/NOTIFY, or another message broker) so events reach SSE connections
 * on every API instance.
 */

export const BUSINESS_LIVE_EVENT_TYPES = [
  "order.created",
  "order.updated",
  "order.paid",
  "order.refunded",
  "appointment.created",
  "appointment.updated",
  "heartbeat",
] as const;

export type BusinessLiveEventType = (typeof BUSINESS_LIVE_EVENT_TYPES)[number];

/** Minimal payload — no customer PII or payment secrets. */
export type BusinessLiveEventPayload = {
  businessId: number;
  orderId?: number;
  appointmentId?: number;
  status?: string;
  timestamp: string;
};

export type BusinessLiveEvent = {
  type: BusinessLiveEventType;
  data: BusinessLiveEventPayload;
};

export type BusinessLiveEventListener = (event: BusinessLiveEvent) => void;

export const BUSINESS_LIVE_HEARTBEAT_INTERVAL_MS = 25_000;

const subscribersByBusiness = new Map<number, Set<BusinessLiveEventListener>>();

export function subscribeBusinessLiveEvents(
  businessId: number,
  listener: BusinessLiveEventListener,
): () => void {
  let set = subscribersByBusiness.get(businessId);
  if (!set) {
    set = new Set();
    subscribersByBusiness.set(businessId, set);
  }
  set.add(listener);
  return () => {
    const current = subscribersByBusiness.get(businessId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      subscribersByBusiness.delete(businessId);
    }
  };
}

export function publishBusinessLiveEvent(
  businessId: number,
  type: BusinessLiveEventType,
  payload: Omit<BusinessLiveEventPayload, "businessId" | "timestamp">,
): void {
  const event: BusinessLiveEvent = {
    type,
    data: {
      businessId,
      ...payload,
      timestamp: new Date().toISOString(),
    },
  };

  const subscribers = subscribersByBusiness.get(businessId);
  if (!subscribers?.size) return;

  for (const listener of subscribers) {
    try {
      listener(event);
    } catch {
      // Isolated subscriber failures must not break publishing.
    }
  }
}

export function formatBusinessLiveSseMessage(event: BusinessLiveEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function formatBusinessLiveSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

/** EventSource cannot set Authorization; accept Clerk JWT via query when needed. */
export function attachLiveEventsBearerFromQuery(req: {
  query: Record<string, unknown>;
  headers: { authorization?: string };
}): void {
  const token = req.query.token;
  if (typeof token === "string" && token.trim() && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${token.trim()}`;
  }
}

/** Test helper — clears all subscribers. */
export function resetBusinessLiveEventBusForTests(): void {
  subscribersByBusiness.clear();
}

export function publishOrderCreatedLiveEvent(
  businessId: number,
  orderId: number,
  status: string,
): void {
  publishBusinessLiveEvent(businessId, "order.created", { orderId, status });
}

export function publishOrderUpdatedLiveEvent(
  businessId: number,
  orderId: number,
  status: string,
): void {
  publishBusinessLiveEvent(businessId, "order.updated", { orderId, status });
}

export function publishOrderPaidLiveEvent(businessId: number, orderId: number): void {
  publishBusinessLiveEvent(businessId, "order.paid", { orderId, status: "PAID" });
}

export function publishOrderRefundedLiveEvent(
  businessId: number,
  orderId: number,
  status: string,
): void {
  publishBusinessLiveEvent(businessId, "order.refunded", { orderId, status });
}

export function publishAppointmentCreatedLiveEvent(
  businessId: number,
  appointmentId: number,
  status: string,
): void {
  publishBusinessLiveEvent(businessId, "appointment.created", { appointmentId, status });
}

export function publishAppointmentUpdatedLiveEvent(
  businessId: number,
  appointmentId: number,
  status: string,
): void {
  publishBusinessLiveEvent(businessId, "appointment.updated", { appointmentId, status });
}
