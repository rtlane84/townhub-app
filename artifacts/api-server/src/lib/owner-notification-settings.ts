export {
  getAppBaseUrl,
  dashboardOrderUrl,
  dashboardAppointmentsUrl,
} from "./notification-urls";

export function resolveOwnerNotificationEmail(business: {
  notificationEmail?: string | null;
  orderNotificationEmail?: string | null;
}): string | null {
  return business.notificationEmail?.trim() || business.orderNotificationEmail?.trim() || null;
}

export function resolveOwnerNotificationPhone(business: {
  notificationPhone?: string | null;
}): string | null {
  const phone = business.notificationPhone?.trim();
  return phone || null;
}

export { paymentMethodLabel } from "./email-templates/components";
