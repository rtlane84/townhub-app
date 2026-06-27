export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}`;
  return "http://localhost:5173";
}

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

export function paymentMethodLabel(paymentMethod: string): string {
  return paymentMethod === "IN_PERSON" ? "Pay at pickup" : "Online payment (card)";
}

export function dashboardOrderUrl(orderId: number): string {
  return `${getAppBaseUrl()}/dashboard/business/orders/${orderId}`;
}

export function dashboardAppointmentsUrl(): string {
  return `${getAppBaseUrl()}/dashboard/business/appointments`;
}
