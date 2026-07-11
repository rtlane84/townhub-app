/**
 * Deep-link path builders for push / in-app notification taps.
 *
 * Paths are app-relative (start with `/`). Native clients open them inside
 * the Capacitor WebView; email/SMS/ntfy continue to use absolute HTTPS URLs
 * from `notification-urls.ts`.
 */

export type NotificationDeepLinkTarget =
  | { type: "ORDER"; orderId: number; audience: "CUSTOMER" | "OWNER" }
  | { type: "APPOINTMENTS"; audience: "OWNER" }
  | { type: "APPOINTMENT"; appointmentRequestId: number; audience: "CUSTOMER" | "OWNER" }
  | { type: "BUSINESS_DASHBOARD" }
  | { type: "BUSINESS_SETTINGS" }
  | { type: "BUSINESS_SUBSCRIPTION" }
  | { type: "ADMIN_APPLICATIONS" }
  | { type: "ADMIN_SYSTEM_STATUS" }
  | { type: "EVENT"; eventId: number }
  | { type: "PATH"; path: string };

export function buildNotificationDeepLinkPath(target: NotificationDeepLinkTarget): string {
  switch (target.type) {
    case "ORDER":
      return target.audience === "OWNER"
        ? `/dashboard/business/orders/${target.orderId}`
        : `/order/${target.orderId}`;
    case "APPOINTMENTS":
      return "/dashboard/business/appointments";
    case "APPOINTMENT":
      return target.audience === "OWNER"
        ? "/dashboard/business/appointments"
        : "/my-orders";
    case "BUSINESS_DASHBOARD":
      return "/dashboard/business";
    case "BUSINESS_SETTINGS":
      return "/dashboard/business/settings";
    case "BUSINESS_SUBSCRIPTION":
      return "/dashboard/business/subscription";
    case "ADMIN_APPLICATIONS":
      return "/dashboard/admin/applications";
    case "ADMIN_SYSTEM_STATUS":
      return "/dashboard/admin/system-status";
    case "EVENT":
      return `/events/${target.eventId}`;
    case "PATH":
      return target.path.startsWith("/") ? target.path : `/${target.path}`;
  }
}

/** Payload fields included in every push notification for client routing. */
export type PushDeepLinkPayload = {
  deepLink: string;
  category?: string;
  eventType?: string;
  orderId?: string;
  appointmentRequestId?: string;
  businessId?: string;
  eventId?: string;
};

export function buildPushDataPayload(input: {
  deepLink: string;
  category?: string;
  eventType?: string;
  orderId?: number;
  appointmentRequestId?: number;
  businessId?: number;
  eventId?: number;
}): PushDeepLinkPayload {
  const data: PushDeepLinkPayload = {
    deepLink: input.deepLink,
  };
  if (input.category) data.category = input.category;
  if (input.eventType) data.eventType = input.eventType;
  if (input.orderId != null) data.orderId = String(input.orderId);
  if (input.appointmentRequestId != null) {
    data.appointmentRequestId = String(input.appointmentRequestId);
  }
  if (input.businessId != null) data.businessId = String(input.businessId);
  if (input.eventId != null) data.eventId = String(input.eventId);
  return data;
}
