/** URL path segments that must not be used as business storefront URLs. */
export const RESERVED_BUSINESS_SLUGS = new Set(["manage", "stats", "checkout"]);

/** Derive a storefront URL segment from a business name (same rules as server-side creation). */
export function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalize a slug query parameter or manual value for lookup. */
export function normalizeBusinessSlugInput(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedBusinessSlug(slug: string): boolean {
  return RESERVED_BUSINESS_SLUGS.has(slug);
}

/** Public path for a business storefront (no origin). */
export function storefrontPathFromSlug(slug: string): string {
  return `/businesses/${slug}`;
}
