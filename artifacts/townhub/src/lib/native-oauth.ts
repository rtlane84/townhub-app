/** Custom URL scheme registered in iOS Info.plist for OAuth return into the app. */
export const NATIVE_OAUTH_SCHEME = "townhub";

/** Bundled Capacitor WebView origin — always remount here after OAuth. */
export const NATIVE_BUNDLED_ORIGIN = "capacitor://localhost";

/** Path where the Capacitor WebView finishes Clerk OAuth (AuthenticateWithRedirectCallback). */
export const NATIVE_SSO_CALLBACK_PATH = "/sso-callback";

/**
 * HTTPS path Clerk redirects to after Google / Apple OAuth in Cap Browser.
 * Must be http(s) — Clerk rejects custom schemes (invalid_url_scheme).
 * This page only bounces into the app via townhub://; it does not finish the session.
 */
export const NATIVE_SSO_HTTPS_BOUNCE_PATH = "/native-sso-callback";

/**
 * Deep link used to bounce from Safari / SFSafariViewController back into the
 * Capacitor WebView after Clerk redirects to the HTTPS bounce page.
 *
 * Use an explicit host (`oauth`) so Cap delivers pathname + path-encoded params;
 * bare `townhub://sso-callback` often arrives with query/path stripped.
 */
export const NATIVE_SSO_DEEP_LINK_HOST = "oauth";
export const NATIVE_SSO_DEEP_LINK = `${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_DEEP_LINK_HOST}${NATIVE_SSO_CALLBACK_PATH}`;

/**
 * Prefix for path-encoded Clerk params. iOS / Cap Browser often deliver
 * custom-scheme URLs with the query string stripped; encoding into the
 * path keeps rotating_token_nonce intact.
 */
export const NATIVE_SSO_ENCODED_PARAM_PREFIX = "sso-callback/p/";

/** @deprecated Use getNativeSsoHttpsCallbackUrl() — Clerk rejects custom-scheme redirect_url. */
export const NATIVE_SSO_CALLBACK_URL = NATIVE_SSO_DEEP_LINK;

export function resolvePublicWebBaseUrl(
  configured: unknown,
  runtimeOrigin: string,
): string {
  const candidate = typeof configured === "string" && configured.trim()
    ? configured.trim()
    : runtimeOrigin.trim();
  if (!/^https:\/\//i.test(candidate)) {
    throw new Error(
      "VITE_PUBLIC_WEB_URL must be an HTTPS URL for native OAuth.",
    );
  }
  return candidate.replace(/\/+$/, "");
}

export function getPublicWebBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
  return resolvePublicWebBaseUrl(env?.VITE_PUBLIC_WEB_URL, runtimeOrigin);
}

/**
 * HTTPS callback Clerk accepts for oauth_* redirect_url.
 * Must match the deployed public web origin (Safari / Cap Browser bounce page).
 */
export function getNativeSsoHttpsCallbackUrl(
  origin = getPublicWebBaseUrl(),
): string {
  const base = resolvePublicWebBaseUrl(origin, origin);
  return `${base}${NATIVE_SSO_HTTPS_BOUNCE_PATH}`;
}

/** Always remount the reviewed bundle — never https://staging after allowNavigation. */
export function getNativeBundledOrigin(runtimeOrigin?: string): string {
  if (runtimeOrigin && runtimeOrigin.startsWith("capacitor://")) {
    return runtimeOrigin.replace(/\/+$/, "");
  }
  return NATIVE_BUNDLED_ORIGIN;
}

export function isNativeSsoCallbackUrl(url: string): boolean {
  if (url.includes(NATIVE_SSO_CALLBACK_PATH) || url.includes(NATIVE_SSO_HTTPS_BOUNCE_PATH)) {
    return true;
  }
  if (url.includes(NATIVE_SSO_ENCODED_PARAM_PREFIX)) {
    return true;
  }
  return (
    url.startsWith(`${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_DEEP_LINK_HOST}`) ||
    url.startsWith(NATIVE_SSO_DEEP_LINK)
  );
}

/** True when the deep link carries Clerk OAuth handshake params. */
export function nativeSsoDeepLinkHasParams(url: string): boolean {
  if (/[?#].*(rotating_token_nonce|__clerk_status)/i.test(url)) return true;
  if (url.includes(`/${NATIVE_SSO_ENCODED_PARAM_PREFIX}`) || url.includes(NATIVE_SSO_ENCODED_PARAM_PREFIX)) {
    const encoded = url.split(NATIVE_SSO_ENCODED_PARAM_PREFIX)[1] ?? "";
    if (!encoded) return false;
    try {
      const decoded = decodeURIComponent(encoded.replace(/\/$/, ""));
      return /rotating_token_nonce|__clerk_status/i.test(decoded);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * When OAuth completes in Cap Browser / Safari, bounce to the app deep link
 * with Clerk params path-encoded (Cap Browser strips query strings).
 *
 * Do NOT bounce to capacitor:// from the HTTPS page — that empties the
 * WebView after allowNavigation left capacitor://localhost.
 */
export function buildNativeSsoDeepLinkFromLocation(search: string, hash = ""): string {
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;
  const fragment = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  const payload = `${query}${fragment}`;
  if (!payload || payload === "?" || payload === "#") {
    return NATIVE_SSO_DEEP_LINK;
  }
  return `${NATIVE_OAUTH_SCHEME}://${NATIVE_SSO_DEEP_LINK_HOST}/${NATIVE_SSO_ENCODED_PARAM_PREFIX}${encodeURIComponent(payload)}`;
}

/**
 * Remount target on the bundled Capacitor origin.
 * Clerk params are path-encoded under /sso-callback/p/… — Cap / WKWebView
 * often strip query strings from capacitor:// and townhub:// navigations.
 */
export function buildNativeSsoCapacitorCallbackUrl(search: string, hash = ""): string {
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;
  const fragment = hash.startsWith("#") || hash === "" ? hash : `#${hash}`;
  const payload = `${query}${fragment}`;
  if (!payload || payload === "?" || payload === "#") {
    return `${NATIVE_BUNDLED_ORIGIN}${NATIVE_SSO_CALLBACK_PATH}`;
  }
  return `${NATIVE_BUNDLED_ORIGIN}/${NATIVE_SSO_ENCODED_PARAM_PREFIX}${encodeURIComponent(payload)}`;
}

/** Decode path-encoded Clerk payload (`…/sso-callback/p/%3F…`) into search+hash. */
export function decodeNativeSsoEncodedPayload(pathname: string): string | null {
  const idx = pathname.indexOf(`/${NATIVE_SSO_ENCODED_PARAM_PREFIX}`);
  const altIdx = pathname.indexOf(NATIVE_SSO_ENCODED_PARAM_PREFIX);
  const start =
    idx >= 0
      ? idx + 1 + NATIVE_SSO_ENCODED_PARAM_PREFIX.length
      : altIdx >= 0
        ? altIdx + NATIVE_SSO_ENCODED_PARAM_PREFIX.length
        : -1;
  if (start < 0) return null;
  const encoded = pathname.slice(start).replace(/\/$/, "");
  if (!encoded) return null;
  try {
    const decoded = decodeURIComponent(encoded);
    if (!decoded) return null;
    return decoded.startsWith("?") || decoded.startsWith("#") ? decoded : `?${decoded}`;
  } catch {
    return null;
  }
}

/**
 * Before React/Clerk boot: if this load used path-encoded SSO params, promote
 * them into the query string via replaceState (no native navigation that can
 * strip query again).
 */
export function promoteNativeSsoPathParamsToSearch(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname, search, hash } = window.location;
  if (search && /rotating_token_nonce|__clerk_status/i.test(search)) {
    return false;
  }
  if (hash && /rotating_token_nonce|__clerk_status/i.test(hash)) {
    return false;
  }
  const decoded = decodeNativeSsoEncodedPayload(pathname);
  if (!decoded) return false;
  const nextUrl = `${NATIVE_SSO_CALLBACK_PATH}${decoded}`;
  window.history.replaceState(window.history.state, "", nextUrl);
  return true;
}

function capacitorSsoRemountFromPayload(origin: string, payload: string): string {
  if (!payload || payload === "?" || payload === "#") {
    return `${origin}${NATIVE_SSO_CALLBACK_PATH}`;
  }
  const normalized =
    payload.startsWith("?") || payload.startsWith("#") ? payload : `?${payload}`;
  return `${origin}/${NATIVE_SSO_ENCODED_PARAM_PREFIX}${encodeURIComponent(normalized)}`;
}

/**
 * Convert a deep-link OAuth return URL into an in-app URL on the bundled
 * Capacitor origin so Clerk can finish the session inside the reviewed app.
 */
export function resolveNativeDeepLinkToAppUrl(rawUrl: string, appOrigin: string): string {
  // SSO returns must remount the reviewed Cap bundle even if the WebView drifted
  // onto https://staging during a bad allowNavigation attempt. Other deep links
  // (orders, notifications) keep the caller's app origin.
  const origin = (
    isNativeSsoCallbackUrl(rawUrl) ? getNativeBundledOrigin(appOrigin) : appOrigin
  ).replace(/\/+$/, "");

  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("capacitor://")) {
    try {
      const parsed = new URL(rawUrl);
      const pathDecoded = decodeNativeSsoEncodedPayload(parsed.pathname);
      if (pathDecoded) {
        return capacitorSsoRemountFromPayload(origin, pathDecoded);
      }
      if (
        parsed.pathname.includes(NATIVE_SSO_HTTPS_BOUNCE_PATH) ||
        parsed.pathname.includes(NATIVE_SSO_CALLBACK_PATH)
      ) {
        return capacitorSsoRemountFromPayload(
          origin,
          `${parsed.search}${parsed.hash}`,
        );
      }
    } catch {
      // fall through
    }
    if (rawUrl.startsWith("capacitor://")) {
      try {
        const parsed = new URL(rawUrl);
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        return rawUrl;
      }
    }
    return rawUrl;
  }

  const withoutScheme = rawUrl.replace(new RegExp(`^${NATIVE_OAUTH_SCHEME}:\\/\\/?`), "");

  const encodedIdx = withoutScheme.indexOf(NATIVE_SSO_ENCODED_PARAM_PREFIX);
  if (encodedIdx >= 0) {
    const encoded = withoutScheme.slice(encodedIdx + NATIVE_SSO_ENCODED_PARAM_PREFIX.length);
    try {
      const decoded = decodeURIComponent(encoded.replace(/\/$/, ""));
      return capacitorSsoRemountFromPayload(origin, decoded);
    } catch {
      return `${origin}${NATIVE_SSO_CALLBACK_PATH}`;
    }
  }

  // townhub://oauth/sso-callback?… or legacy townhub://sso-callback?…
  const pathStart = withoutScheme.indexOf(NATIVE_SSO_CALLBACK_PATH.replace(/^\//, ""));
  if (pathStart >= 0) {
    const rest = withoutScheme.slice(pathStart + NATIVE_SSO_CALLBACK_PATH.replace(/^\//, "").length);
    const suffix = rest.startsWith("?") || rest.startsWith("#") || rest.startsWith("/")
      ? rest.replace(/^\//, "")
      : rest
        ? `?${rest}`
        : "";
    if (suffix.startsWith("?") || suffix.startsWith("#")) {
      return capacitorSsoRemountFromPayload(origin, suffix);
    }
    if (pathStart === 0 || withoutScheme.startsWith(`${NATIVE_SSO_DEEP_LINK_HOST}/`)) {
      return `${origin}${NATIVE_SSO_CALLBACK_PATH}`;
    }
  }

  const withLeadingSlash = withoutScheme.startsWith("/")
    ? withoutScheme
    : `/${withoutScheme}`;
  return `${origin}${withLeadingSlash}`;
}

/** Compact shape of an auth-session return URL for on-device error details. */
export function describeNativeAuthReturnUrl(rawUrl: string): string {
  const hasEncoded = rawUrl.includes(NATIVE_SSO_ENCODED_PARAM_PREFIX);
  const hasQuery = /[?#].*(rotating_token_nonce|__clerk_status)/i.test(rawUrl);
  const bare = isNativeSsoCallbackUrl(rawUrl) && !hasEncoded && !hasQuery;
  const scheme = rawUrl.split(":", 1)[0] ?? "unknown";
  return [
    `scheme=${scheme}`,
    hasEncoded ? "path-encoded=yes" : "path-encoded=no",
    hasQuery ? "query-params=yes" : "query-params=no",
    bare ? "bare-sso=yes" : "bare-sso=no",
  ].join(" · ");
}
