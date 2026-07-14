import { Capacitor } from "@capacitor/core";
import { isKitchenDisplayRoute } from "./kitchen-display-mode.ts";

export { isKitchenDisplayRoute };

/** True when running inside a Capacitor native shell (iOS or Android). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === "android";
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === "web";
}

/** Primary browse routes (also used for pull-to-refresh). */
export const NATIVE_TAB_ROUTES = [
  "/",
  "/businesses",
  "/events",
  "/food-trucks",
] as const;

/** Routes eligible for pull-to-refresh on native. */
export const NATIVE_PULL_TO_REFRESH_ROUTES = NATIVE_TAB_ROUTES;

const ACCOUNT_ROUTE_PREFIXES = [
  "/my-orders",
  "/help",
  "/sign-in",
  "/sign-up",
  "/list-your-business",
  "/setup",
  "/pricing",
  "/account",
  "/privacy-policy",
  "/terms-of-service",
];

export function isDashboardRoute(location: string): boolean {
  return (
    location === "/dashboard/business" ||
    location.startsWith("/dashboard/business/") ||
    location === "/dashboard/admin" ||
    location.startsWith("/dashboard/admin/")
  );
}

/**
 * Show the bottom tab bar on marketplace and hub screens so navigation
 * never disappears. Always true for a given path (any non-special case).
 */
export function isNativeTabRoute(_location: string): boolean {
  return true;
}

export function isAccountRoute(location: string): boolean {
  return ACCOUNT_ROUTE_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(`${prefix}/`),
  );
}

export function shouldShowNativeBottomTabs(location: string): boolean {
  return isNativeApp() && isNativeTabRoute(location);
}

export function isPullToRefreshRoute(location: string): boolean {
  // Kitchen display uses PTR instead of a dedicated Refresh button.
  if (isKitchenDisplayRoute(location)) return true;
  if (isDashboardRoute(location)) return false;
  if (location.startsWith("/businesses/")) return false;
  if (location === "/cart" || location.startsWith("/cart/")) return false;
  if (location.startsWith("/order/")) return false;
  return NATIVE_PULL_TO_REFRESH_ROUTES.some(
    (route) => location === route || (route !== "/" && location.startsWith(`${route}/`)),
  );
}

export function shouldEnableNativePullToRefresh(location: string): boolean {
  // Kitchen PTR also for touch web (iPad Safari) — not Capacitor-only.
  if (isKitchenDisplayRoute(location)) return true;
  return isNativeApp() && isPullToRefreshRoute(location);
}

export function isNavActive(location: string, href: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}
