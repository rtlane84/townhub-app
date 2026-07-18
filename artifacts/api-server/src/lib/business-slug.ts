import { db, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  isReservedBusinessSlug,
  normalizeBusinessSlugInput,
  slugifyBusinessName,
} from "@workspace/api-zod";
import { isPostgresUniqueViolation } from "./postgres-error";

export { slugifyBusinessName, normalizeBusinessSlugInput, isReservedBusinessSlug };
export { isPostgresUniqueViolation };

export async function isBusinessSlugTaken(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.slug, slug))
    .limit(1);
  return !!row;
}

/** Pick the first unused storefront URL, appending -2, -3, … when needed. */
export async function resolveUniqueBusinessSlug(baseSlug: string): Promise<string> {
  const normalized = normalizeBusinessSlugInput(baseSlug) || "business";
  let slug = normalized;
  let suffix = 2;
  while (await isBusinessSlugTaken(slug) || isReservedBusinessSlug(slug)) {
    slug = `${normalized}-${suffix}`;
    suffix++;
  }
  return slug;
}

export type BusinessSlugAvailabilityResult = {
  slug: string;
  available: boolean;
  suggestedSlug?: string;
};

export async function checkBusinessSlugAvailability(
  requestedSlug: string,
): Promise<BusinessSlugAvailabilityResult | null> {
  const slug = normalizeBusinessSlugInput(requestedSlug);
  if (!slug) return null;

  if (isReservedBusinessSlug(slug) || (await isBusinessSlugTaken(slug))) {
    const suggestedSlug = await resolveUniqueBusinessSlug(slug);
    return { slug, available: false, suggestedSlug };
  }

  return { slug, available: true };
}

export function slugifyFromBusinessName(name: string): string {
  const slug = slugifyBusinessName(name);
  return slug || "business";
}
