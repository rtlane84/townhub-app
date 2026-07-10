import { Capacitor } from "@capacitor/core";

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

/** Routes where the native bottom tab bar is shown. */
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
];

export function isDashboardRoute(location: string): boolean {
  return (
    location === "/dashboard/business" ||
    location.startsWith("/dashboard/business/") ||
    location === "/dashboard/admin" ||
    location.startsWith("/dashboard/admin/")
  );
}

export function isNativeTabRoute(location: string): boolean {
  if (isDashboardRoute(location)) return false;
  if (location.startsWith("/businesses/")) return false;
  return (
    NATIVE_TAB_ROUTES.includes(location as (typeof NATIVE_TAB_ROUTES)[number]) ||
    isAccountRoute(location)
  );
}

export function isAccountRoute(location: string): boolean {
  return ACCOUNT_ROUTE_PREFIXES.some(
    (prefix) => location === prefix || location.startsWith(prefix),
  );
}

export function shouldShowNativeBottomTabs(location: string): boolean {
  return isNativeApp() && isNativeTabRoute(location);
}

export function isPullToRefreshRoute(location: string): boolean {
  if (isDashboardRoute(location)) return false;
  return NATIVE_PULL_TO_REFRESH_ROUTES.some(
    (route) => location === route || (route !== "/" && location.startsWith(route + "/")),
  );
}

export function shouldEnableNativePullToRefresh(location: string): boolean {
  return isNativeApp() && isPullToRefreshRoute(location);
}

export function isNavActive(location: string, href: string): boolean {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(href + "/");
}
