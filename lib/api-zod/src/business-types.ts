import { BusinessType as BusinessTypeValues, type BusinessType } from "./generated/types/businessType";
import { storefrontCopy } from "./storefront-mode";

export const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string }> = [
  { value: BusinessTypeValues.FOOD_VENDOR, label: "Restaurant / Food Service" },
  { value: BusinessTypeValues.FLORIST, label: "Florist" },
  { value: BusinessTypeValues.GARDEN_MARKET, label: "Garden / Nursery" },
  { value: BusinessTypeValues.RETAIL_STORE, label: "Retail Shop" },
  { value: BusinessTypeValues.BUILDING_SUPPLY, label: "Building Supply" },
  { value: BusinessTypeValues.SERVICE_PROVIDER, label: "Service Provider" },
  { value: BusinessTypeValues.SALON, label: "Salon / Beauty" },
  { value: BusinessTypeValues.FUNERAL_SERVICE, label: "Funeral Service" },
  { value: BusinessTypeValues.GENERAL, label: "Other / General" },
];

export const PUBLIC_BUSINESS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Food & Drink", value: BusinessTypeValues.FOOD_VENDOR },
  { label: "Florist", value: BusinessTypeValues.FLORIST },
  { label: "Garden Market", value: BusinessTypeValues.GARDEN_MARKET },
  { label: "Retail", value: BusinessTypeValues.RETAIL_STORE },
  { label: "Salon / Beauty", value: BusinessTypeValues.SALON },
  { label: "Service", value: BusinessTypeValues.SERVICE_PROVIDER },
];

export function formatBusinessTypeLabel(type: string): string {
  const match = BUSINESS_TYPE_OPTIONS.find((option) => option.value === type);
  return match?.label ?? type.replace(/_/g, " ");
}

export function isSalonBusiness(type: string | undefined | null): boolean {
  return type === BusinessTypeValues.SALON;
}

/** @deprecated Use storefrontCopy(resolveStorefrontMode(business)) instead. */
export function salonStorefrontCopy(isSalon: boolean) {
  return storefrontCopy(isSalon ? "APPOINTMENT" : "ORDERING");
}
