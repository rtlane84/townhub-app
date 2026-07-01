import { getAppBaseUrl } from "./app-base-url";

export { getAppBaseUrl };

/** Public customer order page (works for guests and signed-in customers). */
export function customerOrderUrl(orderId: number): string {
  return `${getAppBaseUrl()}/order/${orderId}`;
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
