/**
 * Stable feature keys referenced by application code when gating capabilities.
 * The catalog itself lives in the database; plans enable features via plan_features.
 */
export const SUBSCRIPTION_FEATURE_KEYS = {
  ONLINE_ORDERING: "online_ordering",
  APPOINTMENT_REQUESTS: "appointment_requests",
  MOBILE_BUSINESS: "mobile_business",
  /** @deprecated Use MOBILE_BUSINESS */
  FOOD_TRUCK_TRACKING: "mobile_business",
  SMS_NOTIFICATIONS: "sms_notifications",
  EMAIL_NOTIFICATIONS: "email_notifications",
  BUSINESS_WEBSITE: "business_website",
  ANALYTICS: "analytics",
} as const;

export type SubscriptionFeatureKey =
  (typeof SUBSCRIPTION_FEATURE_KEYS)[keyof typeof SUBSCRIPTION_FEATURE_KEYS];

/** Default catalog entries bootstrapped into the database when missing. */
export const DEFAULT_SUBSCRIPTION_FEATURES: Array<{
  key: SubscriptionFeatureKey;
  name: string;
  description: string;
  category: string;
  sortOrder: number;
}> = [
  {
    key: SUBSCRIPTION_FEATURE_KEYS.ONLINE_ORDERING,
    name: "Online Ordering",
    description: "Accept pickup and delivery orders through your storefront.",
    category: "Commerce",
    sortOrder: 10,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.APPOINTMENT_REQUESTS,
    name: "Appointment Requests",
    description: "Let customers request appointments for services.",
    category: "Commerce",
    sortOrder: 20,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.MOBILE_BUSINESS,
    name: "Mobile Business",
    description: "Publish a daily and upcoming location schedule for traveling or pop-up businesses.",
    category: "Commerce",
    sortOrder: 30,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.SMS_NOTIFICATIONS,
    name: "SMS Notifications",
    description: "Send SMS alerts for orders and appointments.",
    category: "Notifications",
    sortOrder: 40,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.EMAIL_NOTIFICATIONS,
    name: "Email Notifications",
    description: "Send branded email updates to customers and owners.",
    category: "Notifications",
    sortOrder: 50,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.BUSINESS_WEBSITE,
    name: "Business page & catalog",
    description: "Public storefront page with hours, branding, and catalog or menu (display without requiring online ordering).",
    category: "Presence",
    sortOrder: 60,
  },
  {
    key: SUBSCRIPTION_FEATURE_KEYS.ANALYTICS,
    name: "Analytics",
    description: "Business performance insights and reporting.",
    category: "Growth",
    sortOrder: 70,
  },
];

export const ENTITLED_SUBSCRIPTION_STATUSES = new Set([
  "BETA",
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
]);

/** Statuses that lock paid plans but may still grant complimentary/founding access. */
export const RESTRICTED_SUBSCRIPTION_STATUSES = new Set([
  "CANCELED",
  "SUSPENDED",
  "INCOMPLETE",
]);

/** Legacy values that may still exist before enum migration. */
export const LEGACY_SUBSCRIPTION_STATUS_ALIASES: Record<string, string> = {
  TRIALING: "TRIAL",
  PAUSED: "SUSPENDED",
};

export function normalizeSubscriptionStatus(status: string): string {
  return LEGACY_SUBSCRIPTION_STATUS_ALIASES[status] ?? status;
}

export function subscriptionStatusGrantsFeatures(status: string): boolean {
  return ENTITLED_SUBSCRIPTION_STATUSES.has(normalizeSubscriptionStatus(status));
}

/** Whether a business subscription status grants features for its plan type. */
export function subscriptionGrantsFeaturesForPlan(status: string, complimentary: boolean): boolean {
  const normalized = normalizeSubscriptionStatus(status);
  if (complimentary) {
    return normalized !== "SUSPENDED";
  }
  if (RESTRICTED_SUBSCRIPTION_STATUSES.has(normalized)) {
    return false;
  }
  return ENTITLED_SUBSCRIPTION_STATUSES.has(normalized);
}
