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
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}
