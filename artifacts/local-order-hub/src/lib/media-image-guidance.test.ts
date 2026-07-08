import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatImageSurfaceGuidance,
  IMAGE_FILE_GUIDANCE,
  IMAGE_SURFACE_GUIDANCE,
  isAcceptedImageMimeType,
  LAUNCH_IMAGE_SURFACES,
} from "./media-image-guidance.ts";
import { validateImageFile } from "./media-upload.ts";

describe("media-image-guidance", () => {
  it("defines guidance for every launch image surface", () => {
    assert.equal(LAUNCH_IMAGE_SURFACES.length, 8);
    for (const surface of LAUNCH_IMAGE_SURFACES) {
      const guidance = IMAGE_SURFACE_GUIDANCE[surface];
      assert.ok(guidance.label.length > 0);
      assert.match(guidance.recommendedSize, /\d+\s×\s\d+\spx/);
      assert.ok(guidance.aspectClass.startsWith("aspect-"));
    }
  });

  it("formats concise recommended and file guidance lines", () => {
    const product = formatImageSurfaceGuidance("product");
    assert.match(product.recommendedLine, /1200 × 900 px \(4:3\)/);
    assert.match(product.recommendedLine, /storefront product cards/i);
    assert.equal(product.fileLine, IMAGE_FILE_GUIDANCE);
    assert.match(product.fileLine, /5 MB/);
  });

  it("accepts supported image mime types only", () => {
    assert.equal(isAcceptedImageMimeType("image/jpeg"), true);
    assert.equal(isAcceptedImageMimeType("image/png"), true);
    assert.equal(isAcceptedImageMimeType("image/svg+xml"), false);
  });
});

describe("validateImageFile", () => {
  it("rejects unsupported formats with friendly guidance", () => {
    const file = { type: "image/svg+xml", size: 1000 } as File;
    const error = validateImageFile(file);
    assert.ok(error);
    assert.match(error!, /JPEG, PNG, WebP, or GIF/);
  });

  it("rejects files over the max size", () => {
    const file = { type: "image/png", size: 6 * 1024 * 1024 } as File;
    const error = validateImageFile(file);
    assert.ok(error);
    assert.match(error!, /5 MB/);
  });

  it("accepts valid image files", () => {
    const file = { type: "image/webp", size: 1024 } as File;
    assert.equal(validateImageFile(file), null);
  });
});
