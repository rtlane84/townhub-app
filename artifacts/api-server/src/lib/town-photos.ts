import type { TownPhoto } from "@workspace/db";
import { randomUUID } from "node:crypto";

const MAX_TOWN_PHOTOS = 20;
const MAX_CAPTION_LENGTH = 120;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Normalize and validate a town-photo collection from the API or DB.
 * Ensures unique ids, stable sort order, and at most one primary photo.
 */
export function normalizeTownPhotos(value: unknown): TownPhoto[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  const photos: TownPhoto[] = [];

  for (const entry of value.slice(0, MAX_TOWN_PHOTOS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const url = asNonEmptyString(row.url);
    if (!url) continue;

    let id = asNonEmptyString(row.id) ?? randomUUID();
    while (seenIds.has(id)) {
      id = randomUUID();
    }
    seenIds.add(id);

    const captionRaw = asNonEmptyString(row.caption);
    const caption = captionRaw ? captionRaw.slice(0, MAX_CAPTION_LENGTH) : null;
    const sortOrderRaw =
      typeof row.sortOrder === "number"
        ? row.sortOrder
        : typeof row.sortOrder === "string"
          ? parseInt(row.sortOrder, 10)
          : photos.length;

    photos.push({
      id,
      url,
      caption,
      isPrimary: Boolean(row.isPrimary),
      sortOrder: Number.isFinite(sortOrderRaw)
        ? Math.round(sortOrderRaw)
        : photos.length,
    });
  }

  photos.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });

  let primaryAssigned = false;
  return photos.map((photo, index) => {
    const isPrimary = photo.isPrimary && !primaryAssigned;
    if (isPrimary) primaryAssigned = true;
    return {
      ...photo,
      isPrimary,
      sortOrder: index,
    };
  });
}
