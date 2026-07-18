import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import sharp from "sharp";
import {
  ByteLruCache,
  optimizeMediaImage,
  parseOptimizedFormat,
  parseOptimizedQuality,
  parseOptimizedWidth,
  resetOptimizedImageCacheForTests,
} from "./media-optimize";

describe("media optimizer", () => {
  let uploadDir: string;
  const previousUploadDir = process.env.MEDIA_UPLOAD_DIR;

  beforeEach(async () => {
    resetOptimizedImageCacheForTests();
    uploadDir = await mkdtemp(path.join(tmpdir(), "townhub-media-optimize-"));
    process.env.MEDIA_UPLOAD_DIR = uploadDir;
    const original = await sharp({
      create: {
        width: 800,
        height: 500,
        channels: 3,
        background: "#165ea8",
      },
    })
      .png()
      .toBuffer();
    await writeFile(path.join(uploadDir, "sample.png"), original);
  });

  afterEach(async () => {
    resetOptimizedImageCacheForTests();
    if (previousUploadDir == null) delete process.env.MEDIA_UPLOAD_DIR;
    else process.env.MEDIA_UPLOAD_DIR = previousUploadDir;
    await rm(uploadDir, { recursive: true, force: true });
  });

  it("validates and bounds query values", () => {
    assert.equal(parseOptimizedWidth("0"), null);
    assert.equal(parseOptimizedWidth("9999"), 2560);
    assert.equal(parseOptimizedFormat("webp"), "webp");
    assert.equal(parseOptimizedFormat("png"), null);
    assert.equal(parseOptimizedQuality("1"), 50);
    assert.equal(parseOptimizedQuality("100"), 95);
  });

  it("keeps the route contract and sends immutable browser caching", async () => {
    const routeSource = await readFile(new URL("../routes/media.ts", import.meta.url), "utf8");
    assert.match(routeSource, /req\.query\.src/);
    assert.match(routeSource, /req\.query\.w/);
    assert.match(routeSource, /req\.query\.fm/);
    assert.match(routeSource, /req\.query\.q/);
    assert.match(routeSource, /public, max-age=31536000, immutable/);
  });

  it("produces a correctly sized WebP image and reuses the cached result", async () => {
    const input = {
      sourceUrl: "/api/media/files/sample.png",
      width: 320,
      format: "webp" as const,
      quality: 80,
    };
    const first = await optimizeMediaImage(input);
    const second = await optimizeMediaImage(input);
    const metadata = await sharp(first.buffer).metadata();

    assert.equal(first.contentType, "image/webp");
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 320);
    assert.strictEqual(second, first);
  });

  it("coalesces concurrent requests for the same transformation", async () => {
    const input = {
      sourceUrl: "/api/media/files/sample.png",
      width: 400,
      format: "webp" as const,
      quality: 80,
    };
    const [first, second, third] = await Promise.all([
      optimizeMediaImage(input),
      optimizeMediaImage(input),
      optimizeMediaImage(input),
    ]);

    assert.strictEqual(second, first);
    assert.strictEqual(third, first);
  });

  it("evicts least-recently-used entries within count and byte bounds", () => {
    const cache = new ByteLruCache<Buffer>(2, 5, (value) => value.byteLength);
    const first = Buffer.alloc(2, 1);
    const second = Buffer.alloc(2, 2);
    const third = Buffer.alloc(2, 3);
    cache.set("first", first);
    cache.set("second", second);
    assert.strictEqual(cache.get("first"), first);
    cache.set("third", third);

    assert.equal(cache.size, 2);
    assert.equal(cache.bytes, 4);
    assert.equal(cache.get("second"), undefined);
    assert.strictEqual(cache.get("first"), first);
    assert.strictEqual(cache.get("third"), third);
  });
});
