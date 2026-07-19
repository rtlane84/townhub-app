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
    assert.equal(LAUNCH_IMAGE_SURFACES.length, 9);
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

  it("uses contain preview for logos and cover for heroes", () => {
    assert.equal(IMAGE_SURFACE_GUIDANCE["business-logo"].previewFit, "contain");
    assert.equal(IMAGE_SURFACE_GUIDANCE["platform-logo"].previewFit, "contain");
    assert.equal(IMAGE_SURFACE_GUIDANCE["homepage-hero-overlay"].previewFit, "contain");
    assert.equal(IMAGE_SURFACE_GUIDANCE["business-hero"].previewFit, undefined);
    assert.equal(IMAGE_SURFACE_GUIDANCE["homepage-hero"].previewFit, undefined);
  });

  it("ImageField preview respects surface previewFit", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "../components/image-field.tsx"), "utf8");
    assert.match(source, /previewFit === "contain"/);
    assert.match(source, /object-contain/);
    assert.match(source, /object-cover/);
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
