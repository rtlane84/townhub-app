export type BusinessLiveEventType =
  | "order.created"
  | "order.updated"
  | "order.paid"
  | "order.refunded"
  | "appointment.created"
  | "appointment.updated"
  | "heartbeat";

/** Minimal SSE payload — mirrors API (no PII). */
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

const PII_FIELD_PATTERN =
  /email|phone|address|token|stripe|customer|notes|name|secret|password/i;

export function assertLiveEventPayloadIsMinimal(payload: BusinessLiveEventPayload): void {
  for (const key of Object.keys(payload)) {
    if (PII_FIELD_PATTERN.test(key)) {
      throw new Error(`Unexpected PII-like field in live event payload: ${key}`);
    }
  }
}

export function isOrderLiveEventType(type: BusinessLiveEventType): boolean {
  return type.startsWith("order.");
}

export function isAppointmentLiveEventType(type: BusinessLiveEventType): boolean {
  return type.startsWith("appointment.");
}
