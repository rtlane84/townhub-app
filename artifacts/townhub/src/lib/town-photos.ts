import type { TownPhoto } from "@workspace/api-client-react";

export type TownPhotoSlide = {
  id: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
};

/**
 * Resolve carousel slides: prefer the admin town-photo collection; otherwise
 * fall back to the legacy single homepage hero image.
 */
export function resolveTownPhotoSlides(
  townPhotos: TownPhoto[] | null | undefined,
  heroImageUrl: string | null | undefined,
): TownPhotoSlide[] {
  const photos = (townPhotos ?? [])
    .filter(
      (photo) => typeof photo.url === "string" && photo.url.trim().length > 0,
    )
    .map((photo) => ({
      id: photo.id,
      url: photo.url.trim(),
      caption: photo.caption?.trim() || null,
      isPrimary: Boolean(photo.isPrimary),
      sortOrder: photo.sortOrder ?? 0,
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });

  if (photos.length > 0) {
    return photos.map(({ id, url, caption, isPrimary }) => ({
      id,
      url,
      caption,
      isPrimary,
    }));
  }

  const fallback = heroImageUrl?.trim();
  if (!fallback) return [];

  return [
    {
      id: "legacy-hero",
      url: fallback,
      caption: null,
      isPrimary: true,
    },
  ];
}

export function createTownPhotoId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `town-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function reorderTownPhotos(
  photos: TownPhoto[],
  fromIndex: number,
  toIndex: number,
): TownPhoto[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= photos.length ||
    toIndex >= photos.length
  ) {
    return photos;
  }
  const next = [...photos];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return photos;
  next.splice(toIndex, 0, moved);
  return next.map((photo, index) => ({ ...photo, sortOrder: index }));
}
