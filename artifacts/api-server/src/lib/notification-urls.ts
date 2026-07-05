import { getAppBaseUrl } from "./app-base-url";
import { createOrderAccessToken } from "./order-access-token";

export { getAppBaseUrl };

export type CustomerOrderUrlOptions = {
  /** Signed guest access token; appended as ?token= when set. */
  accessToken?: string | null;
};

/** Public customer order page (works for guests and signed-in customers). */
export function customerOrderUrl(
  orderId: number,
  options?: CustomerOrderUrlOptions,
): string {
  const base = `${getAppBaseUrl()}/order/${orderId}`;
  const token = options?.accessToken?.trim();
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}

/**
 * Customer-facing order link for email/SMS. Guest orders include an access token;
 * signed-in customer orders omit it because account login grants access.
 */
export function customerOrderUrlForNotification(order: {
  orderId: number;
  customerUserId?: string | null;
}): string {
  if (order.customerUserId) {
    return customerOrderUrl(order.orderId);
  }
  return customerOrderUrl(order.orderId, {
    accessToken: createOrderAccessToken(order.orderId),
  });
}

/** Business dashboard order detail page. */
export function dashboardOrderUrl(orderId: number): string {
  return `${getAppBaseUrl()}/dashboard/business/orders/${orderId}`;
}

export function dashboardAppointmentsUrl(): string {
  return `${getAppBaseUrl()}/dashboard/business/appointments`;
}

export function dashboardSubscriptionUrl(): string {
  return `${getAppBaseUrl()}/dashboard/business/subscription`;
}

export function dashboardBusinessHubUrl(): string {
  return `${getAppBaseUrl()}/dashboard/business`;
}

export function dashboardAdminApplicationsUrl(): string {
  return `${getAppBaseUrl()}/dashboard/admin/applications`;
}

export function listYourBusinessUrl(): string {
  return `${getAppBaseUrl()}/list-your-business`;
}

export function helpCenterUrl(): string {
  return `${getAppBaseUrl()}/help`;
}

export function helpCenterWelcomeVideoUrl(): string {
  return `${helpCenterUrl()}#welcome-video`;
}

export function helpCenterBusinessOwnerTrainingUrl(): string {
  return `${helpCenterUrl()}#business-owner-training`;
}

export function helpCenterCustomerTrainingUrl(): string {
  return `${helpCenterUrl()}#customer-training`;
}
