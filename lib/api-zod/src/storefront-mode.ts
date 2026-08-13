import { BusinessType as BusinessTypeValues } from "./generated/types/businessType";
import type { StorefrontMode } from "./generated/types/storefrontMode";

export const STOREFRONT_MODE_OPTIONS: Array<{ value: StorefrontMode; label: string; description: string }> = [
  {
    value: "ORDERING",
    label: "Online ordering",
    description: "Customers browse products and add items to a cart to checkout.",
  },
  {
    value: "APPOINTMENT",
    label: "Appointment requests",
    description: "Customers browse services and submit appointment requests for you to confirm.",
  },
  {
    value: "INFORMATION",
    label: "Display only",
    description: "Show available items with prices, but no online cart or checkout. Customers contact you directly.",
  },
];

export function defaultStorefrontModeForBusinessType(type: string | undefined | null): StorefrontMode {
  if (type === BusinessTypeValues.SALON) return "APPOINTMENT";
  if (type === BusinessTypeValues.FUNERAL_SERVICE) return "INFORMATION";
  return "ORDERING";
}

export function resolveStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): StorefrontMode {
  if (business.storefrontMode) return business.storefrontMode;
  return defaultStorefrontModeForBusinessType(business.type);
}

export function isInformationStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return resolveStorefrontMode(business) === "INFORMATION";
}

export function isAppointmentStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return resolveStorefrontMode(business) === "APPOINTMENT";
}

export function isOrderingStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return resolveStorefrontMode(business) === "ORDERING";
}

/** Keep the selected commerce mode only while its matching plan feature is active. */
export function coerceEntitledStorefrontMode(
  current: StorefrontMode,
  entitlements: {
    onlineOrderingAllowed: boolean;
    appointmentRequestsAllowed: boolean;
  },
): StorefrontMode {
  if (current === "ORDERING" && entitlements.onlineOrderingAllowed) return "ORDERING";
  if (current === "APPOINTMENT" && entitlements.appointmentRequestsAllowed) return "APPOINTMENT";
  if (current === "INFORMATION") return "INFORMATION";
  return "INFORMATION";
}

export function showsStorefrontCatalog(
  mode: StorefrontMode,
  options?: { businessWebsiteEntitled?: boolean | null },
): boolean {
  if (options && options.businessWebsiteEntitled !== true) return false;
  return mode === "ORDERING" || mode === "APPOINTMENT" || mode === "INFORMATION";
}

export type StorefrontEntitledBusiness = {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
  onlineOrderingEntitled?: boolean | null;
  appointmentRequestsEntitled?: boolean | null;
};

/**
 * Whether the public storefront may show cart / add-to-cart.
 * Requires ORDERING mode and an explicit active plan entitlement.
 */
export function allowsStorefrontOrdering(business: StorefrontEntitledBusiness): boolean {
  if (business.onlineOrderingEntitled !== true) return false;
  return isOrderingStorefrontMode(business);
}

export function hidesStorefrontCart(business: StorefrontEntitledBusiness): boolean {
  return !allowsStorefrontOrdering(business);
}

export function allowsStorefrontAppointments(business: StorefrontEntitledBusiness): boolean {
  if (business.appointmentRequestsEntitled !== true) return false;
  return isAppointmentStorefrontMode(business);
}

/**
 * Effective public browsing mode for UI copy and actions.
 * Unsupported commerce modes fail closed to INFORMATION.
 */
export function resolvePublicBrowseMode(business: StorefrontEntitledBusiness): StorefrontMode {
  const mode = resolveStorefrontMode(business);
  if (mode === "ORDERING" && !allowsStorefrontOrdering(business)) return "INFORMATION";
  if (mode === "APPOINTMENT" && !allowsStorefrontAppointments(business)) return "INFORMATION";
  return mode;
}

export function acceptsAppointmentRequests(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return isAppointmentStorefrontMode(business);
}

export type StorefrontModeBusiness = {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
};

const ORDERING_BUSINESS_HUB_PATHS = new Set([
  "/dashboard/business/orders",
  "/dashboard/business/kitchen",
]);

const APPOINTMENT_BUSINESS_HUB_PATHS = new Set([
  "/dashboard/business/appointments",
]);

/** Whether a Business Hub nav route matches the business storefront mode. */
export function isBusinessHubNavVisibleForStorefrontMode(
  href: string,
  business: StorefrontModeBusiness,
): boolean {
  const mode = resolveStorefrontMode(business);
  if (ORDERING_BUSINESS_HUB_PATHS.has(href)) return mode === "ORDERING";
  if (APPOINTMENT_BUSINESS_HUB_PATHS.has(href)) return mode === "APPOINTMENT";
  return true;
}

/** Public directory / storefront capability badge for the resolved storefront mode. */
export function storefrontModePublicBadge(mode: StorefrontMode): {
  label: string;
  icon: "ordering" | "appointment" | "information";
} {
  if (mode === "APPOINTMENT") {
    return { label: "Appointments", icon: "appointment" };
  }
  if (mode === "INFORMATION") {
    return { label: "No Online Ordering", icon: "information" };
  }
  return { label: "Online Ordering", icon: "ordering" };
}

export function normalizeWebsiteUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatWebsiteDisplay(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function storefrontCopy(mode: StorefrontMode) {
  const isAppointment = mode === "APPOINTMENT";
  const isInformation = mode === "INFORMATION";
  return {
    catalogHeading: "Shop",
    catalogSubtitle: isAppointment
      ? "Browse available services and request an appointment."
      : isInformation
        ? "Browse available items below. Contact the business directly for more information."
        : "Browse available items and add them to your cart.",
    allItemsLabel: "All Items",
    emptyTitle: "Nothing has been added yet.",
    emptyDescription: "Please contact the business directly for current offerings.",
    emptyCategoryTitle: "No items in this category",
    emptyCategoryDescription: "This category is empty.",
    addButtonLabel: isAppointment ? "Request Service" : "Add",
    addToastTitle: isAppointment ? "Opening request form" : "Added to cart",
    addToastDescription: (name: string) =>
      isAppointment
        ? `Submit a request for ${name}.`
        : `${name} added to your cart.`,
    cutoffLabel: (time: string) => (isAppointment ? `Request by ${time}` : `Order by ${time}`),
    prepTimeLabel: (minutes: number) => (isAppointment ? `${minutes} min service` : `${minutes}m`),
    primaryCtaLabel: isAppointment ? "Request Appointment" : null,
    informationTagline: isInformation
      ? "Contact this business directly for more information."
      : null,
  };
}
