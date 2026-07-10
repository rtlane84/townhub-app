import {
  ACCEPTED_IMAGE_FORMATS_LABEL,
  isAcceptedImageMimeType,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
} from "./media-image-guidance.ts";

/** Resolve image src for preview/display (hosted uploads and external URLs). */
export function resolveImageSrc(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function readFileAsObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function validateImageFile(file: File): string | null {
  if (!isAcceptedImageMimeType(file.type)) {
    return `Please choose an image file (${ACCEPTED_IMAGE_FORMATS_LABEL}).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`;
  }
  return null;
}
