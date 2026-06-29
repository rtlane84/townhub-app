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
];

export function defaultStorefrontModeForBusinessType(type: string | undefined | null): StorefrontMode {
  return type === BusinessTypeValues.SALON ? "APPOINTMENT" : "ORDERING";
}

export function resolveStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): StorefrontMode {
  if (business.storefrontMode) return business.storefrontMode;
  return defaultStorefrontModeForBusinessType(business.type);
}

export function isAppointmentStorefrontMode(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return resolveStorefrontMode(business) === "APPOINTMENT";
}

export function acceptsAppointmentRequests(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return isAppointmentStorefrontMode(business);
}

export function storefrontCopy(mode: StorefrontMode) {
  const isAppointment = mode === "APPOINTMENT";
  return {
    catalogHeading: isAppointment ? "Services" : "Products",
    catalogSubtitle: isAppointment
      ? "Browse available services and request an appointment. The business will follow up to confirm availability."
      : null,
    allItemsLabel: isAppointment ? "All Services" : "All Items",
    emptyTitle: isAppointment ? "No services listed" : "No products found",
    emptyDescription: isAppointment
      ? "Check back soon for available services."
      : "This category is empty.",
    addButtonLabel: isAppointment ? "Request Service" : "Add",
    addToastTitle: isAppointment ? "Opening request form" : "Added to cart",
    addToastDescription: (name: string) =>
      isAppointment
        ? `Submit a request for ${name}.`
        : `${name} added to your cart.`,
    cutoffLabel: (time: string) => (isAppointment ? `Request by ${time}` : `Order by ${time}`),
    prepTimeLabel: (minutes: number) => (isAppointment ? `${minutes} min service` : `${minutes}m`),
    primaryCtaLabel: isAppointment ? "Request Appointment" : null,
  };
}
