import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("platform theme API hero settings", () => {
  it("serializes hero display defaults for backwards compatibility", async () => {
    const source = await readFile(new URL("./platform.ts", import.meta.url), "utf8");
    assert.match(source, /heroImageFit: "cover"/);
    assert.match(source, /heroImagePosition: "center"/);
    assert.match(source, /heroOverlaySize: "medium"/);
    assert.match(source, /heroOverlayAlign: "center"/);
    assert.match(source, /showShopButton: true/);
    assert.match(source, /showListBusinessButton: true/);
    assert.match(source, /heroButtonPlacement: "bottom-center"/);
    assert.match(source, /normalizeHeroImageFit/);
    assert.match(source, /normalizeHeroImagePosition/);
    assert.match(source, /normalizeHeroOverlaySize/);
    assert.match(source, /normalizeHeroOverlayAlign/);
    assert.match(source, /normalizeHeroButtonPlacement/);
    assert.match(source, /"heroImageFit"/);
    assert.match(source, /"heroOverlayImageUrl"/);
    assert.match(source, /"showShopButton"/);
    assert.match(source, /"showListBusinessButton"/);
    assert.match(source, /"heroButtonPlacement"/);
  });
});
