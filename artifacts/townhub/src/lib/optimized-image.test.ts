import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOptimizedMediaUrl,
  buildOptimizedSrcSet,
  isOptimizableMediaUrl,
} from "./optimized-image.ts";

describe("optimized-image", () => {
  const supabaseUrl =
    "https://example.supabase.co/storage/v1/object/public/media/platform/hero.png";

  it("detects TownHub media URLs", () => {
    assert.equal(isOptimizableMediaUrl(supabaseUrl), true);
    assert.equal(isOptimizableMediaUrl("/api/media/files/hero.png"), true);
    assert.equal(isOptimizableMediaUrl("https://cdn.example.com/hero.png"), false);
  });

  it("builds optimize API URLs with width and format", () => {
    const url = buildOptimizedMediaUrl(supabaseUrl, { width: 1280, format: "webp", quality: 85 });
    assert.match(url, /^\/api\/media\/optimize\?/);
    assert.match(url, /fm=webp/);
    assert.match(url, /w=1280/);
    assert.match(url, /q=85/);
    assert.match(url, /src=https%3A%2F%2Fexample\.supabase\.co/);
  });

  it("builds responsive srcset descriptors", () => {
    const srcSet = buildOptimizedSrcSet(supabaseUrl, [640, 1280], "webp");
    assert.match(srcSet, /640w/);
    assert.match(srcSet, /1280w/);
    assert.match(srcSet, /fm=webp/);
  });
});
