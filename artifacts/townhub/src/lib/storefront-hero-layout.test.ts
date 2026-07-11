import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("storefront hero layout", () => {
  it("uses a full-bleed mobile hero and large rounded desktop stage", async () => {
    const source = await readFile(new URL("../pages/storefront.tsx", import.meta.url), "utf8");
    assert.match(source, /w-full rounded-none/);
    assert.match(source, /md:mx-auto md:rounded-\[2rem\]/);
    assert.match(source, /md:-mt-\[7\.125rem\]/);
    assert.match(source, /-mt-16 px-5 md:-mt-\[7\.125rem\]/);
  });

  it("reduces mobile logo overlap while preserving desktop overlap", async () => {
    const source = await readFile(new URL("../pages/storefront.tsx", import.meta.url), "utf8");
    assert.match(source, /-mt-12 md:-mt-\[4\.5rem\]/);
    assert.match(source, /pt-10 text-center md:pt-12/);
  });

  it("keeps the business info card full width on mobile", async () => {
    const source = await readFile(new URL("../pages/storefront.tsx", import.meta.url), "utf8");
    assert.match(source, /"order-1 w-full"/);
    assert.match(source, /informationCatalogEmpty && "md:mx-auto md:max-w-md"/);
  });
});
