/**
 * Public origin for storefront links.
 * Prefers VITE_PUBLIC_WEB_URL (required on Capacitor) so native never emits capacitor://.
 * Falls back to the browser origin on ordinary http(s) web.
 */

function storefrontPathFromSlug(slug: string): string {
  return `/businesses/${slug}`;
}

function readConfiguredPublicWebUrl(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const value = env?.VITE_PUBLIC_WEB_URL;
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : undefined;
}

export function resolvePublicStorefrontOrigin(
  runtimeOrigin?: string,
  configuredPublicWebUrl?: string | null,
): string | null {
  const configured =
    configuredPublicWebUrl === undefined
      ? readConfiguredPublicWebUrl()
      : configuredPublicWebUrl?.trim().replace(/\/+$/, "") || undefined;
  if (configured && /^https:\/\//i.test(configured)) {
    return configured;
  }

  const runtime =
    runtimeOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  if (/^https?:\/\//i.test(runtime) && !runtime.startsWith("capacitor://")) {
    return runtime.replace(/\/+$/, "");
  }
  return null;
}

/** Full public storefront URL for sharing / copy. */
export function buildPublicStorefrontUrl(
  slug: string,
  options?: { runtimeOrigin?: string; publicWebBaseUrl?: string | null },
): string {
  const path = storefrontPathFromSlug(slug);
  const origin = resolvePublicStorefrontOrigin(
    options?.runtimeOrigin,
    options?.publicWebBaseUrl,
  );
  if (!origin) {
    return path;
  }
  return `${origin}${path}`;
}

/** Host + path without protocol — e.g. townhub.io/businesses/clay-diner */
export function buildPublicStorefrontDisplayUrl(
  slug: string,
  options?: { runtimeOrigin?: string; publicWebBaseUrl?: string | null },
): string {
  const path = storefrontPathFromSlug(slug);
  const origin = resolvePublicStorefrontOrigin(
    options?.runtimeOrigin,
    options?.publicWebBaseUrl,
  );
  if (!origin) {
    return path.replace(/^\//, "");
  }
  try {
    return `${new URL(origin).host}${path}`;
  } catch {
    return path.replace(/^\//, "");
  }
}
