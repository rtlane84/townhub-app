export type ImageSurface =
  | "product"
  | "business-logo"
  | "business-hero"
  | "event"
  | "highlight"
  | "platform-logo";

export interface ImageSurfaceGuidance {
  label: string;
  recommendedSize: string;
  aspectClass: string;
  hint?: string;
}

export const IMAGE_SURFACE_GUIDANCE: Record<ImageSurface, ImageSurfaceGuidance> = {
  product: {
    label: "Product image",
    recommendedSize: "800 × 800 px (square)",
    aspectClass: "aspect-square",
    hint: "Shows on your storefront product cards.",
  },
  "business-logo": {
    label: "Business logo",
    recommendedSize: "400 × 400 px (square)",
    aspectClass: "aspect-square",
    hint: "Appears on your storefront and business listings.",
  },
  "business-hero": {
    label: "Hero image",
    recommendedSize: "1600 × 900 px (16:9)",
    aspectClass: "aspect-[16/9]",
    hint: "Wide banner at the top of your storefront.",
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
    hint: "Shown in the site header and footer.",
  },
};

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
