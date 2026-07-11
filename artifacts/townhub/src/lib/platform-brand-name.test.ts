import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitPlatformBrandName } from "./platform-brand-name.ts";

describe("platform brand name", () => {
  it("splits Clay TownHub into prefix, Town, and Hub", () => {
    assert.deepEqual(splitPlatformBrandName("Clay TownHub"), {
      prefix: "Clay ",
      town: "Town",
      hub: "Hub",
    });
  });

  it("splits TownHub without a prefix", () => {
    assert.deepEqual(splitPlatformBrandName("TownHub"), {
      prefix: "",
      town: "Town",
      hub: "Hub",
    });
  });

  it("falls back when Hub is absent", () => {
    assert.deepEqual(splitPlatformBrandName("Marketplace"), {
      prefix: "Marketplace",
      town: null,
      hub: null,
    });
  });
});
