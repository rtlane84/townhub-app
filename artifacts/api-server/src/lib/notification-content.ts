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

export {
  buildOwnerNewAppointmentEmail,
  buildCustomerAppointmentStatusEmail,
} from "./email-templates/appointment-emails";
export {
  buildOwnerNewAppointmentSms,
  buildCustomerAppointmentStatusSms,
} from "./notification-sms";
export { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
export { buildOwnerNewOrderSms, buildCustomerLifecycleSms } from "./notification-sms";
export { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";
export { buildSubscriptionLifecycleEmail } from "./email-templates/subscription-emails";
export { paymentMethodLabel } from "./email-templates/components";
