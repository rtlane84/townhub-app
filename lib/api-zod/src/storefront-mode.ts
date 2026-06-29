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
    description: "Show your menu or products with prices, but no online cart or checkout. Customers contact you directly.",
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

export function showsStorefrontCatalog(mode: StorefrontMode): boolean {
  return mode === "ORDERING" || mode === "APPOINTMENT" || mode === "INFORMATION";
}

export function allowsStorefrontOrdering(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return isOrderingStorefrontMode(business);
}

export function hidesStorefrontCart(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return !isOrderingStorefrontMode(business);
}

export function acceptsAppointmentRequests(business: {
  type?: string | null;
  storefrontMode?: StorefrontMode | null;
}): boolean {
  return isAppointmentStorefrontMode(business);
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

export function informationPrimaryCtaLabel(hasPhone: boolean): string {
  return hasPhone ? "Call to Order" : "Contact Business";
}

export function storefrontCopy(mode: StorefrontMode) {
  const isAppointment = mode === "APPOINTMENT";
  const isInformation = mode === "INFORMATION";
  return {
    catalogHeading: isAppointment ? "Services" : isInformation ? "Menu & Products" : "Products",
    catalogSubtitle: isAppointment
      ? "Browse available services and request an appointment. The business will follow up to confirm availability."
      : isInformation
        ? "Browse items and prices below. Online ordering is not available — please contact the business directly."
        : null,
    allItemsLabel: isAppointment ? "All Services" : isInformation ? "All Items" : "All Items",
    emptyTitle: isAppointment ? "No services listed" : isInformation ? "Nothing listed yet" : "No products found",
    emptyDescription: isAppointment
      ? "Check back soon for available services."
      : isInformation
        ? "This business has not published a menu or product list yet."
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
    informationTagline: isInformation
      ? "Online ordering is not available. Contact us directly to place an order."
      : null,
  };
}
