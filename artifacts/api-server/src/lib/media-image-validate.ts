import sharp from "sharp";
import { isAllowedImageMimeType } from "./media-storage";

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function validateUploadedImageBuffer(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAllowedImageMimeType(declaredMimeType)) {
    return { ok: false, error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." };
  }

  let metadata: { format?: string };
  try {
    metadata = await sharp(buffer, { failOn: "none" }).metadata();
  } catch {
    return { ok: false, error: "Uploaded file is not a valid image." };
  }

  const detectedMime = metadata.format ? MIME_BY_FORMAT[metadata.format] : undefined;
  if (!detectedMime) {
    return { ok: false, error: "Uploaded file is not a supported image format." };
  }

  if (detectedMime !== declaredMimeType.toLowerCase()) {
    return { ok: false, error: "Image content does not match the declared file type." };
  }

  return { ok: true };
}
