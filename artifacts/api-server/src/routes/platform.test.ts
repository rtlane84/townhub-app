import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("platform theme API hero settings", () => {
  it("serializes hero display defaults for backwards compatibility", async () => {
    const source = await readFile(new URL("./platform.ts", import.meta.url), "utf8");
    assert.match(source, /heroImageFit: "cover"/);
    assert.match(source, /heroImagePosition: "center"/);
    assert.match(source, /showHeroText: true/);
    assert.match(source, /showHeroButtons: true/);
    assert.match(source, /normalizeHeroImageFit/);
    assert.match(source, /normalizeHeroImagePosition/);
    assert.match(source, /"heroImageFit"/);
    assert.match(source, /"showHeroText"/);
    assert.match(source, /"showHeroButtons"/);
  });
});
