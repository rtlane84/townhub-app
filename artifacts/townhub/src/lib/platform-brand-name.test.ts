import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitPlatformBrandName } from "./platform-brand-name.ts";

describe("platform brand name", () => {
  it("splits a prefixed TownHaven into prefix, Town, and Haven", () => {
    assert.deepEqual(splitPlatformBrandName("Community TownHaven"), {
      prefix: "Community ",
      town: "Town",
      hub: "Haven",
    });
  });

  it("splits TownHaven without a prefix", () => {
    assert.deepEqual(splitPlatformBrandName("TownHaven"), {
      prefix: "",
      town: "Town",
      hub: "Haven",
    });
  });

  it("falls back when Haven is absent", () => {
    assert.deepEqual(splitPlatformBrandName("Marketplace"), {
      prefix: "Marketplace",
      town: null,
      hub: null,
    });
  });
});
