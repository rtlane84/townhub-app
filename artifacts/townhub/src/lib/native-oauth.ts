/** Custom URL scheme registered in iOS Info.plist for OAuth return into the app. */
export const NATIVE_OAUTH_SCHEME = "townhub";

/** Path where the Capacitor WebView finishes Clerk OAuth (AuthenticateWithRedirectCallback). */
export const NATIVE_SSO_CALLBACK_PATH = "/sso-callback";

/**
 * HTTPS path Clerk redirects to after Google OAuth in Safari.
 * Must be http(s) — Clerk rejects custom schemes (invalid_url_scheme).
 * This page only bounces into the app via townhub://; it does not finish the session.
 */
export const NATIVE_SSO_HTTPS_BOUNCE_PATH = "/native-sso-callback";

/**
 * Deep link used to bounce from Safari / SFSafariViewController back into the
 * Capacitor WebView after Clerk redirects to the HTTPS bounce page.
 */
export const NATIVE_SSO_DEEP_LINK = `${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_CALLBACK_PATH.replace(/^\//, "")}`;

/** @deprecated Use getNativeSsoHttpsCallbackUrl() — Clerk rejects custom-scheme redirect_url. */
export const NATIVE_SSO_CALLBACK_URL = NATIVE_SSO_DEEP_LINK;

/**
 * HTTPS callback Clerk accepts for oauth_google redirect_url.
 * Must match the deployed frontend origin loaded by the Capacitor WebView.
 */
export function getNativeSsoHttpsCallbackUrl(
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${NATIVE_SSO_HTTPS_BOUNCE_PATH}`;
}

export function isNativeSsoCallbackUrl(url: string): boolean {
  return (
    url.startsWith(NATIVE_SSO_DEEP_LINK) ||
    url.includes(NATIVE_SSO_CALLBACK_PATH) ||
    url.includes(NATIVE_SSO_HTTPS_BOUNCE_PATH)
  );
}

/**
 * When OAuth completes in Safari, bounce to the app deep link with the same
 * Clerk query/hash so the WebView can finish the session on /sso-callback.
 */
export function buildNativeSsoDeepLinkFromLocation(search: string, hash = ""): string {
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;
  const fragment = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  return `${NATIVE_SSO_DEEP_LINK}${query}${fragment}`;
}

/**
 * Convert a deep-link OAuth return URL into an in-app HTTPS URL on the
 * deployed frontend origin so Clerk can finish the session in the WebView.
 */
export function resolveNativeDeepLinkToAppUrl(rawUrl: string, appOrigin: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const withoutScheme = rawUrl.replace(new RegExp(`^${NATIVE_OAUTH_SCHEME}:\\/\\/?`), "");
  const withLeadingSlash = withoutScheme.startsWith("/")
    ? withoutScheme
    : `/${withoutScheme}`;
  return `${appOrigin.replace(/\/+$/, "")}${withLeadingSlash}`;
}
