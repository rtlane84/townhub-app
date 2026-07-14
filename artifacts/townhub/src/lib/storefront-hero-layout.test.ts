import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("storefront hero layout", () => {
  it("uses a rounded hero with overlapping logo treatment", async () => {
    const source = await readFile(
      new URL("../pages/storefront.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /rounded-\[1\.5rem\]/);
    assert.match(source, /-mt-7 ml-4/);
    assert.match(source, /StorefrontDetailHeader/);
    assert.match(source, /rounded-\[1\.5rem\] bg-card/);
  });

  it("renders hours and location cards with presence-aware placeholders", async () => {
    const source = await readFile(
      new URL("../pages/storefront.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /StorefrontHoursCard/);
    assert.match(source, /StorefrontLocationCard/);
    assert.match(source, /resolveStorefrontPresence/);
  });

  it("keeps mode-aware commerce empty states", async () => {
    const source = await readFile(
      new URL("../pages/storefront.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /Menu not posted yet/);
    assert.match(source, /Services not posted yet/);
    assert.match(source, /button-call-empty-shop/);
  });
});
