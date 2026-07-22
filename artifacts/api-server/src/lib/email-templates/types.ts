export type OrderItemLine = {
  productName: string;
  quantity: number;
  unitPrice?: number;
};

export type OrderTotalsSummary = {
  subtotal: number;
  tax: number;
  taxLabel: string | null;
  deliveryFee: number | null;
  total: number;
};

export function orderTotalsSummaryFromNotification(order: OrderNotificationData): OrderTotalsSummary {
  return {
    subtotal: order.subtotal,
    tax: order.tax,
    taxLabel: order.taxLabel,
    deliveryFee: order.deliveryFee,
    total: order.total,
  };
}

export function formatOrderTotalsTextLines(totals: OrderTotalsSummary): string[] {
  const lines = [`Subtotal: $${totals.subtotal.toFixed(2)}`];
  if (totals.tax > 0) {
    lines.push(`${totals.taxLabel?.trim() || "Sales Tax"}: $${totals.tax.toFixed(2)}`);
  }
  if (totals.deliveryFee != null && totals.deliveryFee > 0) {
    lines.push(`Delivery Fee: $${totals.deliveryFee.toFixed(2)}`);
  }
  lines.push(`Total: $${totals.total.toFixed(2)}`);
  return lines;
}

export type OrderNotificationData = {
  orderId: number;
  orderNumber: string;
  businessOrderNumber?: number | null;
  businessId: number;
  businessName: string;
  /** IANA timezone used for customer-facing notification times. */
  timeZone: string;
  businessLogoUrl?: string | null;
  businessAddress?: string | null;
  pickupInstructions?: string | null;
  customerName: string;
  customerUserId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  fulfillmentType: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  taxLabel: string | null;
  deliveryFee: number | null;
  total: number;
  items: OrderItemLine[];
  orderedAt: Date | string;
  notes?: string | null;
  estimatedWindowStart?: Date | string | null;
  estimatedWindowEnd?: Date | string | null;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export type SubscriptionNotificationData = {
  businessId: number;
  businessName: string;
  businessLogoUrl?: string | null;
  planName: string;
  statusLabel: string;
  trialEndsAt?: Date | string | null;
  billingInterval?: "monthly" | "yearly" | null;
  priceLabel: string;
  amountCharged?: string | null;
  nextBillingDate?: Date | string | null;
  cancellationDate?: Date | string | null;
  cancelAtPeriodEnd?: boolean;
  gracePeriodNote?: string | null;
  subscriptionUrl: string;
  businessHubUrl: string;
  manageBillingUrl: string;
  reactivateSubscriptionUrl: string;
  helpCenterUrl: string;
  welcomeVideoUrl: string;
  businessOwnerTrainingUrl: string;
  customerTrainingUrl: string;
};

export type SubscriptionNotificationEvent =
  | "SUBSCRIPTION_WELCOME"
  | "SUBSCRIPTION_TRIAL_STARTED"
  | "SUBSCRIPTION_TRIAL_ENDING_7D"
  | "SUBSCRIPTION_TRIAL_ENDING_1D"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_PAYMENT_SUCCEEDED"
  | "SUBSCRIPTION_PAYMENT_FAILED"
  | "SUBSCRIPTION_CANCEL_SCHEDULED"
  | "SUBSCRIPTION_CANCELED"
  | "SUBSCRIPTION_EXPIRED";

export type PlatformAdminSubscriptionEvent =
  | "ADMIN_SUBSCRIPTION_PAID_STARTED"
  | "ADMIN_TRIAL_STARTED"
  | "ADMIN_PAYMENT_FAILED"
  | "ADMIN_SUBSCRIPTION_CANCELED"
  | "ADMIN_SUBSCRIPTION_EXPIRED";

export type PlatformAdminApplicationEvent = "ADMIN_APPLICATION_SUBMITTED";

export type PlatformAdminEvent = PlatformAdminSubscriptionEvent | PlatformAdminApplicationEvent;

export type AppointmentNotificationData = {
  businessName: string;
  businessLogoUrl?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string | null;
  statusNote?: string | null;
};

export type CustomerLifecycleEvent =
  | "ORDER_RECEIVED"
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY_FOR_PICKUP"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED";

export const CUSTOMER_NOTIFIABLE_STATUSES = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELED",
] as const;

export type CustomerNotifiableStatus = (typeof CUSTOMER_NOTIFIABLE_STATUSES)[number];

export function statusToCustomerEvent(status: string): CustomerLifecycleEvent | null {
  switch (status) {
    case "CONFIRMED":
      return "ORDER_ACCEPTED";
    case "PREPARING":
      return "ORDER_PREPARING";
    case "READY_FOR_PICKUP":
      return "ORDER_READY_FOR_PICKUP";
    case "OUT_FOR_DELIVERY":
      return "ORDER_OUT_FOR_DELIVERY";
    case "COMPLETED":
      return "ORDER_COMPLETED";
    case "CANCELED":
      return "ORDER_CANCELLED";
    default:
      return null;
  }
}
