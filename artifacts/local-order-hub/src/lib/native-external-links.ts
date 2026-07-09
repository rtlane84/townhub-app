const EXTERNAL_SCHEMES = ["mailto:", "tel:", "sms:", "maps:", "geo:"];

const EXTERNAL_HOST_PATTERNS = [
  /^(.+\.)?stripe\.com$/i,
  /^(.+\.)?facebook\.com$/i,
  /^(.+\.)?fb\.com$/i,
  /^(.+\.)?google\.com$/i,
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

export function isExternalHttpLink(href: string, appHost: string): boolean {
  if (isExternalScheme(href)) return true;

  try {
    const link = resolveUrl(href);
    if (link.protocol !== "http:" && link.protocol !== "https:") {
      return false;
    }

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
  if (options?.target === "_blank" || options?.target === "_system") {
    return isExternalHttpLink(href, appHost) || href.startsWith("http");
  }
  return isExternalHttpLink(href, appHost);
}
