import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isReservedBusinessSlug,
  normalizeBusinessSlugInput,
  slugifyBusinessName,
  storefrontPathFromSlug,
} from "@workspace/api-zod";

describe("business slug helpers", () => {
  it("slugifies business names consistently", () => {
    assert.equal(slugifyBusinessName("Clay Diner"), "clay-diner");
    assert.equal(slugifyBusinessName("  Main St. Bakery!! "), "main-st-bakery");
    assert.equal(slugifyBusinessName("---"), "");
  });

  it("normalizes slug input", () => {
    assert.equal(normalizeBusinessSlugInput(" Clay-Diner "), "clay-diner");
    assert.equal(normalizeBusinessSlugInput("clay_diner"), "clay-diner");
  });

  it("marks reserved storefront paths", () => {
    assert.equal(isReservedBusinessSlug("manage"), true);
    assert.equal(isReservedBusinessSlug("clay-diner"), false);
  });

  it("builds storefront paths", () => {
    assert.equal(storefrontPathFromSlug("clay-diner"), "/businesses/clay-diner");
  });
});
