/**
 * Canonical notification category registry.
 *
 * Categories are the unit of user preference and routing. Event types
 * (ORDER_ACCEPTED, NEW_ORDER, …) map onto a category; the pipeline then
 * decides recipients and delivery channels.
 */

export type NotificationAudience = "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "CUSTOMER";

export type NotificationCategoryDefinition = {
  key: string;
  audience: NotificationAudience;
  label: string;
  description: string;
  /** Default when no preference row exists. */
  defaultEnabled: boolean;
  /** Whether the category is implemented today (false = reserved / future). */
  implemented: boolean;
  /**
   * When false, the category is mandatory: hidden from preference toggles and
   * push delivery ignores user opt-outs.
   */
  userToggleable?: boolean;
};

export const NOTIFICATION_CATEGORIES = {
  // ── Platform Admin ──────────────────────────────────────────
  ADMIN_NEW_APPLICATION: {
    key: "ADMIN_NEW_APPLICATION",
    audience: "PLATFORM_ADMIN",
    label: "New business application",
    description: "A business applied to join the platform.",
    defaultEnabled: true,
    implemented: true,
  },
  ADMIN_CRITICAL_ALERT: {
    key: "ADMIN_CRITICAL_ALERT",
    audience: "PLATFORM_ADMIN",
    label: "Critical platform alerts",
    description: "Urgent operational issues that need admin attention.",
    defaultEnabled: true,
    implemented: true,
  },
  ADMIN_PAYMENT_FAILURE: {
    key: "ADMIN_PAYMENT_FAILURE",
    audience: "PLATFORM_ADMIN",
    label: "Subscription / payment failures",
    description: "Business subscription payment failures and related billing events.",
    defaultEnabled: true,
    implemented: true,
  },
  ADMIN_JOB_FAILURE: {
    key: "ADMIN_JOB_FAILURE",
    audience: "PLATFORM_ADMIN",
    label: "Background job failures",
    description: "Scheduled or internal jobs that failed.",
    defaultEnabled: true,
    implemented: false,
  },

  // ── Business Owners ─────────────────────────────────────────
  OWNER_NEW_ORDER: {
    key: "OWNER_NEW_ORDER",
    audience: "BUSINESS_OWNER",
    label: "New order",
    description: "A customer placed a new order.",
    defaultEnabled: true,
    implemented: true,
  },
  OWNER_ORDER_CANCELED: {
    key: "OWNER_ORDER_CANCELED",
    audience: "BUSINESS_OWNER",
    label: "Order canceled",
    description: "An order was canceled.",
    defaultEnabled: true,
    implemented: false,
  },
  OWNER_APPOINTMENT_REQUEST: {
    key: "OWNER_APPOINTMENT_REQUEST",
    audience: "BUSINESS_OWNER",
    label: "Appointment request",
    description: "A customer requested an appointment.",
    defaultEnabled: true,
    implemented: true,
  },
  OWNER_CUSTOMER_MESSAGE: {
    key: "OWNER_CUSTOMER_MESSAGE",
    audience: "BUSINESS_OWNER",
    label: "Customer message",
    description: "A customer sent a message.",
    defaultEnabled: true,
    implemented: false,
  },
  OWNER_STRIPE_ISSUE: {
    key: "OWNER_STRIPE_ISSUE",
    audience: "BUSINESS_OWNER",
    label: "Stripe account issues",
    description: "Problems with Stripe Connect, refunds, or payouts.",
    defaultEnabled: true,
    implemented: true,
    userToggleable: false,
  },
  OWNER_LOW_INVENTORY: {
    key: "OWNER_LOW_INVENTORY",
    audience: "BUSINESS_OWNER",
    label: "Low inventory",
    description: "A product is running low on stock.",
    defaultEnabled: true,
    implemented: false,
  },
  OWNER_SUBSCRIPTION: {
    key: "OWNER_SUBSCRIPTION",
    audience: "BUSINESS_OWNER",
    label: "Subscription updates",
    description: "Trial, billing, and plan changes for your business.",
    defaultEnabled: true,
    // Push not wired yet — hide from TownHub App Push until implemented.
    implemented: false,
  },

  // ── Customers ───────────────────────────────────────────────
  CUSTOMER_ORDER_ACCEPTED: {
    key: "CUSTOMER_ORDER_ACCEPTED",
    audience: "CUSTOMER",
    label: "Order accepted",
    description: "The business accepted your order.",
    defaultEnabled: true,
    implemented: true,
  },
  CUSTOMER_ORDER_READY: {
    key: "CUSTOMER_ORDER_READY",
    audience: "CUSTOMER",
    label: "Order ready",
    description: "Your order is ready for pickup or on the way.",
    defaultEnabled: true,
    implemented: true,
  },
  CUSTOMER_ORDER_COMPLETED: {
    key: "CUSTOMER_ORDER_COMPLETED",
    audience: "CUSTOMER",
    label: "Order completed",
    description: "Your order was completed.",
    defaultEnabled: true,
    implemented: true,
  },
  CUSTOMER_ORDER_UPDATES: {
    key: "CUSTOMER_ORDER_UPDATES",
    audience: "CUSTOMER",
    label: "Other order updates",
    description: "Order received, preparing, canceled, and refund notices.",
    defaultEnabled: true,
    implemented: true,
  },
  CUSTOMER_APPOINTMENT_DECISION: {
    key: "CUSTOMER_APPOINTMENT_DECISION",
    audience: "CUSTOMER",
    label: "Appointment approved / declined",
    description: "The business approved or declined your appointment request.",
    defaultEnabled: true,
    implemented: true,
  },
  CUSTOMER_APPOINTMENT_REMINDER: {
    key: "CUSTOMER_APPOINTMENT_REMINDER",
    audience: "CUSTOMER",
    label: "Appointment reminders",
    description: "Reminders before an upcoming appointment.",
    defaultEnabled: true,
    implemented: false,
  },
  CUSTOMER_EVENT_REMINDER: {
    key: "CUSTOMER_EVENT_REMINDER",
    audience: "CUSTOMER",
    label: "Event reminders",
    description: "Reminders for community events you follow.",
    defaultEnabled: true,
    implemented: false,
  },
} as const satisfies Record<string, NotificationCategoryDefinition>;

export type NotificationCategoryKey = keyof typeof NOTIFICATION_CATEGORIES;

export const ALL_NOTIFICATION_CATEGORY_KEYS = Object.keys(
  NOTIFICATION_CATEGORIES,
) as NotificationCategoryKey[];

export function getNotificationCategory(
  key: string,
): NotificationCategoryDefinition | undefined {
  return NOTIFICATION_CATEGORIES[key as NotificationCategoryKey];
}

export function listNotificationCategories(options?: {
  audience?: NotificationAudience;
  implementedOnly?: boolean;
  /** When true (default), omit mandatory categories that users cannot toggle. */
  toggleableOnly?: boolean;
}): NotificationCategoryDefinition[] {
  const toggleableOnly = options?.toggleableOnly !== false;
  return ALL_NOTIFICATION_CATEGORY_KEYS.map((key) => NOTIFICATION_CATEGORIES[key]).filter(
    (cat) => {
      if (options?.audience && cat.audience !== options.audience) return false;
      if (options?.implementedOnly && !cat.implemented) return false;
      if (toggleableOnly && cat.userToggleable === false) return false;
      return true;
    },
  );
}

/** Map legacy / domain event types onto preference categories. */
export function categoryForEventType(eventType: string): NotificationCategoryKey | null {
  switch (eventType) {
    case "ADMIN_APPLICATION_SUBMITTED":
      return "ADMIN_NEW_APPLICATION";
    case "ADMIN_PAYMENT_FAILED":
    case "ADMIN_SUBSCRIPTION_CANCELED":
    case "ADMIN_SUBSCRIPTION_EXPIRED":
      return "ADMIN_PAYMENT_FAILURE";
    case "ADMIN_SUBSCRIPTION_PAID_STARTED":
    case "ADMIN_TRIAL_STARTED":
      return "ADMIN_CRITICAL_ALERT";
    case "NEW_ORDER":
      return "OWNER_NEW_ORDER";
    case "NEW_APPOINTMENT_REQUEST":
      return "OWNER_APPOINTMENT_REQUEST";
    case "REFUND_FAILED":
    case "STRIPE_CONNECT_ISSUE":
      return "OWNER_STRIPE_ISSUE";
    case "SUBSCRIPTION_TRIAL_STARTED":
    case "SUBSCRIPTION_TRIAL_ENDING":
    case "SUBSCRIPTION_ACTIVATED":
    case "SUBSCRIPTION_PAYMENT_FAILED":
    case "SUBSCRIPTION_CANCELED":
    case "SUBSCRIPTION_EXPIRED":
    case "APPLICATION_APPROVED":
    case "APPLICATION_REJECTED":
      return "OWNER_SUBSCRIPTION";
    case "ORDER_ACCEPTED":
      return "CUSTOMER_ORDER_ACCEPTED";
    case "ORDER_READY_FOR_PICKUP":
    case "ORDER_OUT_FOR_DELIVERY":
      return "CUSTOMER_ORDER_READY";
    case "ORDER_COMPLETED":
      return "CUSTOMER_ORDER_COMPLETED";
    case "ORDER_RECEIVED":
    case "ORDER_PREPARING":
    case "ORDER_CANCELLED":
    case "ORDER_REFUND":
      return "CUSTOMER_ORDER_UPDATES";
    case "APPOINTMENT_CONFIRMED":
    case "APPOINTMENT_DECLINED":
      return "CUSTOMER_APPOINTMENT_DECISION";
    default:
      return null;
  }
}
