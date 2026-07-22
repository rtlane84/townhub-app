/**
 * Customer-facing marketplace routes where the Report a problem FAB may appear.
 * Owner/admin dashboards, marketing/apply flows, auth, and legal pages are excluded.
 */
export function isCustomerFacingReportRoute(location: string): boolean {
  const path = (location.split("?")[0] || "/").replace(/\/+$/, "") || "/";

  if (path.startsWith("/dashboard")) return false;
  if (path.startsWith("/checkout/return")) return false;
  if (path === "/for-businesses" || path.startsWith("/for-businesses/")) return false;
  if (path === "/list-your-business" || path.startsWith("/list-your-business/")) return false;
  if (path === "/app" || path.startsWith("/app/")) return false;
  if (path === "/pricing" || path.startsWith("/pricing/")) return false;
  if (path === "/setup" || path.startsWith("/setup/")) return false;
  if (
    path === "/privacy-policy" ||
    path === "/terms-of-service" ||
    path === "/business-seller-agreement"
  ) {
    return false;
  }
  if (
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/sso-callback") ||
    path.startsWith("/native-sso-callback") ||
    path.startsWith("/native-checkout-return")
  ) {
    return false;
  }
  if (path.startsWith("/debug")) return false;

  const exactAllow = new Set([
    "/",
    "/businesses",
    "/events",
    "/food-trucks",
    "/cart",
    "/my-orders",
    "/account",
    "/help",
  ]);
  if (exactAllow.has(path)) return true;

  if (path.startsWith("/businesses/")) return true;
  if (path.startsWith("/my-orders/")) return true;
  if (path.startsWith("/order/")) return true;

  return false;
}
