/** Custom URL scheme registered in iOS Info.plist for OAuth return. */
export const NATIVE_OAUTH_SCHEME = "townhub";

/** Deep-link path Clerk redirects to after Google/Apple OAuth in the system browser. */
export const NATIVE_SSO_CALLBACK_PATH = "/sso-callback";

export const NATIVE_SSO_CALLBACK_URL = `${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_CALLBACK_PATH.replace(/^\//, "")}`;

export function isNativeSsoCallbackUrl(url: string): boolean {
  return (
    url.startsWith(`${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_CALLBACK_PATH.replace(/^\//, "")}`) ||
    url.includes(NATIVE_SSO_CALLBACK_PATH)
  );
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
