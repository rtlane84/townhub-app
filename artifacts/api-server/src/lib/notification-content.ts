import { formatTime12h } from "@workspace/api-zod";
import { dashboardAppointmentsUrl } from "./notification-urls";

export type NotificationStatus = "SENT" | "LOGGED" | "FAILED";

type DeliveryResult = {
  sent: boolean;
  providerUnavailable?: boolean;
  error?: string;
};

export function resolveNotificationStatus(result: DeliveryResult): NotificationStatus {
  if (result.sent) return "SENT";
  if (result.providerUnavailable) return "LOGGED";
  return "FAILED";
}

export function buildOwnerNewAppointmentEmail(request: {
  businessName: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string | null;
}): { subject: string; body: string } {
  const subject = `New appointment request — ${request.businessName}`;
  const body = [
    `New appointment request for ${request.businessName}`,
    ``,
    `Customer: ${request.customerName}`,
    request.serviceName ? `Service: ${request.serviceName}` : "",
    `Requested: ${request.requestedDate} at ${formatTime12h(request.requestedTime)}`,
    request.customerEmail ? `Email: ${request.customerEmail}` : "",
    request.customerPhone ? `Phone: ${request.customerPhone}` : "",
    request.notes ? `\nNotes: ${request.notes}` : "",
    ``,
    `View requests: ${dashboardAppointmentsUrl()}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, body };
}

export function buildOwnerNewAppointmentSms(request: {
  businessName: string;
  customerName: string;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
}): string {
  const service = request.serviceName ? ` · ${request.serviceName}` : "";
  return [
    `${request.businessName}: New appointment request`,
    `${request.customerName}${service} · ${request.requestedDate} ${formatTime12h(request.requestedTime)}`,
    dashboardAppointmentsUrl(),
  ].join("\n");
}

// Re-export template builders for tests and legacy imports
export { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
export { buildOwnerNewOrderSms, buildCustomerLifecycleSms } from "./notification-sms";
export { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";
export { paymentMethodLabel } from "./email-templates/components";
