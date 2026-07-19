export type ImageSurface =
  | "product"
  | "business-logo"
  | "business-hero"
  | "homepage-hero"
  | "homepage-hero-overlay"
  | "homepage-town-photo"
  | "event"
  | "highlight"
  | "platform-logo";

export interface ImageSurfaceGuidance {
  label: string;
  recommendedSize: string;
  aspectClass: string;
  /** Optional max-width for the preview frame in settings UIs. */
  previewMaxClass?: string;
  /**
   * How the settings ImageField preview should fit the frame.
   * Logos use contain so they match public storefront/directory display;
   * heroes and photos default to cover.
   */
  previewFit?: "contain" | "cover";
  hint?: string;
}

export const IMAGE_SURFACE_GUIDANCE: Record<
  ImageSurface,
  ImageSurfaceGuidance
> = {
  product: {
    label: "Product image",
    recommendedSize: "1200 × 900 px (4:3)",
    aspectClass: "aspect-[4/3]",
    hint: "Matches the photo area on your storefront product cards.",
  },
  "business-logo": {
    label: "Business logo",
    recommendedSize: "400 × 400 px (square)",
    aspectClass: "aspect-square",
    previewMaxClass: "max-w-[7.5rem]",
    previewFit: "contain",
    hint: "Appears on your storefront and business listings.",
  },
  "business-hero": {
    label: "Storefront hero image",
    recommendedSize: "1600 × 900 px (16:9)",
    aspectClass: "aspect-[16/9]",
    previewMaxClass: "max-w-sm",
    hint: "Wide banner at the top of your public storefront page.",
  },
  "homepage-hero": {
    label: "Homepage hero image",
    recommendedSize: "1920 × 800 px (wide banner)",
    aspectClass: "aspect-[21/9]",
    hint: "Fallback background when no town photos are uploaded.",
  },
  "homepage-hero-overlay": {
    label: "Hero overlay image",
    recommendedSize: "1200 × 600 px transparent PNG",
    aspectClass: "aspect-[2/1]",
    previewFit: "contain",
    hint: "Transparent logo + text that sits over the hero background. Never cropped.",
  },
  "homepage-town-photo": {
    label: "Town photo",
    recommendedSize: "1600 × 900 px (16:9)",
    aspectClass: "aspect-[16/9]",
    hint: "Homepage carousel slide. Use object-cover-safe crops; important subjects near center.",
  },
  event: {
    label: "Event image",
    recommendedSize: "1200 × 675 px (16:9)",
    aspectClass: "aspect-[16/9]",
    hint: "Optional image for the community events calendar.",
  },
  highlight: {
    label: "Highlight image",
    recommendedSize: "800 × 800 px (square)",
    aspectClass: "aspect-square",
    hint: "Thumbnail on the homepage highlights section.",
  },
  "platform-logo": {
    label: "Platform logo",
    recommendedSize: "200 × 200 px (square)",
    aspectClass: "aspect-square",
    previewMaxClass: "max-w-[7.5rem]",
    previewFit: "contain",
    hint: "Shown in the site header and footer.",
  },
};

/** Surfaces that ship with ImageField guidance for launch. */
export const LAUNCH_IMAGE_SURFACES = Object.keys(
  IMAGE_SURFACE_GUIDANCE,
) as ImageSurface[];

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ACCEPTED_IMAGE_TYPES = ACCEPTED_IMAGE_MIME_TYPES.join(",");
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_LABEL = "5 MB";
export const ACCEPTED_IMAGE_FORMATS_LABEL = "JPEG, PNG, WebP, or GIF";

/** One-line file-type and size limits shown under every image field. */
export const IMAGE_FILE_GUIDANCE = `${ACCEPTED_IMAGE_FORMATS_LABEL} · max ${MAX_IMAGE_SIZE_LABEL}`;

export function formatImageSurfaceGuidance(surface: ImageSurface): {
  recommendedLine: string;
  fileLine: string;
} {
  const guidance = IMAGE_SURFACE_GUIDANCE[surface];
  const recommendedLine = guidance.hint
    ? `Recommended: ${guidance.recommendedSize} · ${guidance.hint}`
    : `Recommended: ${guidance.recommendedSize}`;

  return {
    recommendedLine,
    fileLine: IMAGE_FILE_GUIDANCE,
  };
}

export function isAcceptedImageMimeType(mimeType: string): boolean {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}
