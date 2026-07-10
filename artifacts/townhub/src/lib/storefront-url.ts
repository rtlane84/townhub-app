import { storefrontPathFromSlug } from "@workspace/api-zod";

/** Full public storefront URL for the current site origin. */
export function buildPublicStorefrontUrl(slug: string): string {
  if (typeof window === "undefined") {
    return storefrontPathFromSlug(slug);
  }
  return `${window.location.origin}${storefrontPathFromSlug(slug)}`;
}

/** Host + path without protocol — e.g. townhub.com/businesses/clay-diner */
export function buildPublicStorefrontDisplayUrl(slug: string): string {
  if (typeof window === "undefined") {
    return storefrontPathFromSlug(slug).replace(/^\//, "");
  }
  return `${window.location.host}${storefrontPathFromSlug(slug)}`;
}
