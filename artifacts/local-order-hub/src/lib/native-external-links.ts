const EXTERNAL_SCHEMES = ["mailto:", "tel:", "sms:", "maps:", "geo:"];

/** Hosts that should leave the WebView (not OAuth / auth providers). */
const EXTERNAL_HOST_PATTERNS = [
  /^(.+\.)?stripe\.com$/i,
  /^(.+\.)?facebook\.com$/i,
  /^(.+\.)?fb\.com$/i,
  /^maps\.apple\.com$/i,
  /^(.+\.)?instagram\.com$/i,
  /^(.+\.)?twitter\.com$/i,
  /^(.+\.)?x\.com$/i,
  /^(.+\.)?linkedin\.com$/i,
  /^(.+\.)?youtube\.com$/i,
  /^(.+\.)?tiktok\.com$/i,
];

const EXTERNAL_PATH_PATTERNS = [
  /\/privacy(?:-policy)?\/?$/i,
  /\/terms(?:-of-(?:service|use))?\/?$/i,
  /\/legal\//i,
];

/** Google Maps / directions — open externally. Auth hosts stay in-app except Google OAuth. */
const GOOGLE_MAPS_HOST_PATTERNS = [
  /^maps\.google\./i,
  /^www\.google\.[^/]+$/i,
  /^google\.[^/]+$/i,
];

const GOOGLE_MAPS_PATH_PATTERN = /^\/maps(\/|$)/i;

/**
 * Clerk / Apple auth can stay in the WebView.
 * Google OAuth must NOT — Google returns Error 403: disallowed_useragent in WKWebView.
 */
const IN_APP_AUTH_HOST_PATTERNS = [
  /^(.+\.)?clerk\.com$/i,
  /^(.+\.)?accounts\.dev$/i,
  /^(.+\.)?googleusercontent\.com$/i,
  /^appleid\.apple\.com$/i,
];

export function isExternalScheme(href: string): boolean {
  return EXTERNAL_SCHEMES.some((scheme) => href.startsWith(scheme));
}

export function isStripeCheckoutUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return /(^|\.)stripe\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function resolveUrl(href: string): URL {
  if (/^https?:\/\//i.test(href)) {
    return new URL(href);
  }
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://localhost";
  return new URL(href, base);
}

export function isInAppAuthUrl(href: string): boolean {
  try {
    const link = resolveUrl(href);
    if (/^accounts\.google\./i.test(link.hostname)) return false;
    return IN_APP_AUTH_HOST_PATTERNS.some((pattern) => pattern.test(link.hostname));
  } catch {
    return false;
  }
}

export function isGoogleMapsUrl(href: string): boolean {
  try {
    const link = resolveUrl(href);
    if (!GOOGLE_MAPS_HOST_PATTERNS.some((pattern) => pattern.test(link.hostname))) {
      return false;
    }
    if (/^accounts\.google\./i.test(link.hostname)) return false;
    if (/^maps\.google\./i.test(link.hostname)) return true;
    return GOOGLE_MAPS_PATH_PATTERN.test(link.pathname) || link.searchParams.has("api");
  } catch {
    return false;
  }
}

export function isExternalHttpLink(href: string, appHost: string): boolean {
  if (isExternalScheme(href)) return true;
  if (isInAppAuthUrl(href)) return false;

  try {
    const link = resolveUrl(href);
    if (link.protocol !== "http:" && link.protocol !== "https:") {
      return false;
    }

    if (isGoogleMapsUrl(href)) return true;

    if (link.hostname === appHost) {
      return EXTERNAL_PATH_PATTERNS.some((pattern) => pattern.test(link.pathname));
    }

    return EXTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(link.hostname));
  } catch {
    return false;
  }
}

export function shouldOpenLinkExternally(
  href: string,
  appHost: string,
  options?: { target?: string | null; forceExternal?: boolean },
): boolean {
  if (options?.forceExternal) return true;
  if (isExternalScheme(href)) return true;
  if (isInAppAuthUrl(href)) return false;
  if (options?.target === "_blank" || options?.target === "_system") {
    if (isInAppAuthUrl(href)) return false;
    return isExternalHttpLink(href, appHost) || href.startsWith("http");
  }
  return isExternalHttpLink(href, appHost);
}
