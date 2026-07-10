import { BusinessType as BusinessTypeValues, type BusinessType } from "./generated/types/businessType";
import { storefrontCopy } from "./storefront-mode";

/** Active business identity categories (what the business is). */
export const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string }> = [
  { value: BusinessTypeValues.FOOD_VENDOR, label: "Restaurant" },
  { value: BusinessTypeValues.COFFEE_SHOP, label: "Coffee Shop" },
  { value: BusinessTypeValues.BAKERY, label: "Bakery" },
  { value: BusinessTypeValues.GROCERY, label: "Grocery" },
  { value: BusinessTypeValues.FLORIST, label: "Florist" },
  { value: BusinessTypeValues.GARDEN_MARKET, label: "Farm Market" },
  { value: BusinessTypeValues.RETAIL_STORE, label: "Boutique" },
  { value: BusinessTypeValues.BUILDING_SUPPLY, label: "Hardware" },
  { value: BusinessTypeValues.SERVICE_PROVIDER, label: "Professional Services" },
  { value: BusinessTypeValues.SALON, label: "Salon / Beauty" },
  { value: BusinessTypeValues.FUNERAL_SERVICE, label: "Funeral Service" },
  { value: BusinessTypeValues.GENERAL, label: "Other / General" },
];

export const PUBLIC_BUSINESS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "ALL" },
  { label: "Restaurants", value: BusinessTypeValues.FOOD_VENDOR },
  { label: "Coffee", value: BusinessTypeValues.COFFEE_SHOP },
  { label: "Bakeries", value: BusinessTypeValues.BAKERY },
  { label: "Grocery", value: BusinessTypeValues.GROCERY },
  { label: "Florist", value: BusinessTypeValues.FLORIST },
  { label: "Farm Market", value: BusinessTypeValues.GARDEN_MARKET },
  { label: "Boutique", value: BusinessTypeValues.RETAIL_STORE },
  { label: "Hardware", value: BusinessTypeValues.BUILDING_SUPPLY },
  { label: "Salon / Beauty", value: BusinessTypeValues.SALON },
  { label: "Services", value: BusinessTypeValues.SERVICE_PROVIDER },
];

/** Food-oriented categories — mobile mode surfaces as "Food Truck" publicly. */
const FOOD_CATEGORY_TYPES = new Set<string>([
  BusinessTypeValues.FOOD_VENDOR,
  BusinessTypeValues.COFFEE_SHOP,
  BusinessTypeValues.BAKERY,
  BusinessTypeValues.GROCERY,
]);

export function formatBusinessTypeLabel(type: string): string {
  const match = BUSINESS_TYPE_OPTIONS.find((option) => option.value === type);
  if (match) return match.label;
  // Legacy labels for rows not yet migrated
  if (type === "FOOD_TRUCK") return "Restaurant";
  if (type === "CAFE_BAKERY") return "Coffee Shop";
  return type.replace(/_/g, " ");
}

export function isSalonBusiness(type: string | undefined | null): boolean {
  return type === BusinessTypeValues.SALON;
}

export function isFoodCategoryBusiness(type: string | undefined | null): boolean {
  if (!type) return false;
  if (FOOD_CATEGORY_TYPES.has(type)) return true;
  return type === "FOOD_TRUCK" || type === "CAFE_BAKERY";
}

/**
 * Public capability label when Mobile Business mode is enabled.
 * Identity (type) stays separate; this only describes the mobile operation.
 */
export function mobileBusinessPublicLabel(type: string | undefined | null): string {
  if (!type) return "Mobile Business";
  if (isFoodCategoryBusiness(type)) return "Food Truck";
  if (type === BusinessTypeValues.FLORIST) return "Mobile Florist";
  if (type === BusinessTypeValues.GARDEN_MARKET) return "Mobile Market";
  return "Mobile Business";
}

/** Normalize legacy type values written before the type/mode split. */
export function normalizeLegacyBusinessType(type: string): {
  type: BusinessType;
  isMobileBusiness: boolean;
} {
  if (type === "FOOD_TRUCK") {
    return { type: BusinessTypeValues.FOOD_VENDOR, isMobileBusiness: true };
  }
  if (type === "CAFE_BAKERY") {
    return { type: BusinessTypeValues.COFFEE_SHOP, isMobileBusiness: false };
  }
  const known = BUSINESS_TYPE_OPTIONS.some((option) => option.value === type);
  return {
    type: (known ? type : BusinessTypeValues.GENERAL) as BusinessType,
    isMobileBusiness: false,
  };
}

/** @deprecated Use storefrontCopy(resolveStorefrontMode(business)) instead. */
export function salonStorefrontCopy(isSalon: boolean) {
  return storefrontCopy(isSalon ? "APPOINTMENT" : "ORDERING");
}
