/**
 * Maps Business Hub routes to subscription feature keys from the database catalog.
 */
export function resolveBusinessHubFeatureKey(pathname: string): string | null {
  const normalized = pathname.split("?")[0] ?? pathname;
  let best: { prefix: string; featureKey: string | null } | null = null;

  for (const item of BUSINESS_HUB_NAV_ITEMS) {
    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.prefix.length) {
        best = { prefix: item.href, featureKey: item.featureKey };
      }
    }
  }

  return best?.featureKey ?? null;
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

/** Feature-gated Business Hub nav sections (null featureKey = always available). */
export const BUSINESS_HUB_NAV_ITEMS: Array<{
  href: string;
  label: string;
  featureKey: string | null;
}> = [
  { href: "/dashboard/business", label: "Overview", featureKey: null },
  { href: "/dashboard/business/orders", label: "Orders", featureKey: "online_ordering" },
  { href: "/dashboard/business/kitchen", label: "Kitchen", featureKey: "online_ordering" },
  { href: "/dashboard/business/appointments", label: "Appointments", featureKey: "appointment_requests" },
  { href: "/dashboard/business/products", label: "Products", featureKey: "business_website" },
  { href: "/dashboard/business/product-options", label: "Product Options", featureKey: "business_website" },
  { href: "/dashboard/business/categories", label: "Categories", featureKey: "business_website" },
  { href: "/dashboard/business/locations", label: "Locations", featureKey: "food_truck_tracking" },
  { href: "/dashboard/business/subscription", label: "Subscription", featureKey: null },
  { href: "/dashboard/business/settings", label: "Settings", featureKey: null },
];
