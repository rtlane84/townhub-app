type HubStorefrontMode = "ORDERING" | "APPOINTMENT" | "INFORMATION";

export type BusinessHubNavItem = {
  href: string;
  label: string;
  featureKey: string | null;
};

/** Feature-gated Business Hub nav sections (null featureKey = always available). */
export const BUSINESS_HUB_NAV_ITEMS: BusinessHubNavItem[] = [
  { href: "/dashboard/business", label: "Overview", featureKey: null },
  { href: "/dashboard/business/orders", label: "Orders", featureKey: "online_ordering" },
  { href: "/dashboard/business/kitchen", label: "Kitchen", featureKey: "online_ordering" },
  { href: "/dashboard/business/appointments", label: "Appointments", featureKey: "appointment_requests" },
  { href: "/dashboard/business/products", label: "Items", featureKey: "business_website" },
  { href: "/dashboard/business/product-options", label: "Item Options", featureKey: "business_website" },
  { href: "/dashboard/business/categories", label: "Categories", featureKey: "business_website" },
  { href: "/dashboard/business/locations", label: "Locations", featureKey: "food_truck_tracking" },
  { href: "/dashboard/business/subscription", label: "Subscription", featureKey: null },
  { href: "/dashboard/business/settings", label: "Settings", featureKey: null },
];

const ORDERING_BUSINESS_HUB_PATHS = new Set([
  "/dashboard/business/orders",
  "/dashboard/business/kitchen",
]);

const APPOINTMENT_BUSINESS_HUB_PATHS = new Set([
  "/dashboard/business/appointments",
]);

export function isBusinessHubNavVisibleForStorefrontMode(
  href: string,
  storefrontMode: HubStorefrontMode,
): boolean {
  if (ORDERING_BUSINESS_HUB_PATHS.has(href)) return storefrontMode === "ORDERING";
  if (APPOINTMENT_BUSINESS_HUB_PATHS.has(href)) return storefrontMode === "APPOINTMENT";
  return true;
}

export function resolveBusinessHubNavItem(pathname: string): BusinessHubNavItem | null {
  const normalized = pathname.split("?")[0] ?? pathname;
  let best: BusinessHubNavItem | null = null;

  for (const item of BUSINESS_HUB_NAV_ITEMS) {
    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) {
        best = item;
      }
    }
  }

  return best;
}

/**
 * Maps Business Hub routes to subscription feature keys from the database catalog.
 */
export function resolveBusinessHubFeatureKey(pathname: string): string | null {
  return resolveBusinessHubNavItem(pathname)?.featureKey ?? null;
}

export function businessHubFeatureMeta(featureKey: string): {
  label: string;
  description: string;
} {
  const route = BUSINESS_HUB_NAV_ITEMS.find((item) => item.featureKey === featureKey);
  return {
    label: route?.label ?? featureKey.replace(/_/g, " "),
    description: "Upgrade your plan to unlock this capability for your business.",
  };
}

export function getVisibleBusinessHubNavItems(
  storefrontMode: HubStorefrontMode | null | undefined,
): BusinessHubNavItem[] {
  if (!storefrontMode) return BUSINESS_HUB_NAV_ITEMS;
  return BUSINESS_HUB_NAV_ITEMS.filter((item) =>
    isBusinessHubNavVisibleForStorefrontMode(item.href, storefrontMode),
  );
}

export function isBusinessHubRouteHiddenByStorefrontMode(
  pathname: string,
  storefrontMode: HubStorefrontMode | null | undefined,
): boolean {
  if (!storefrontMode) return false;
  const navItem = resolveBusinessHubNavItem(pathname);
  if (!navItem) return false;
  return !isBusinessHubNavVisibleForStorefrontMode(navItem.href, storefrontMode);
}
