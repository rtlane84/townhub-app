import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeStreetAddress,
  isCompleteStreetAddress,
  isValidUsZip,
  normalizeUsZipForLookup,
  parseStreetAddress,
} from "../../../../lib/api-zod/src/street-address.ts";

describe("street address helpers", () => {
  it("validates US ZIP codes", () => {
    assert.equal(isValidUsZip("25043"), true);
    assert.equal(isValidUsZip("25043-1234"), true);
    assert.equal(isValidUsZip("2504"), false);
    assert.equal(isValidUsZip("abcde"), false);
  });

  it("normalizes ZIP for lookup to five digits", () => {
    assert.equal(normalizeUsZipForLookup("25043-1234"), "25043");
    assert.equal(normalizeUsZipForLookup("2504"), null);
  });

  it("composes a full street address", () => {
    assert.equal(
      composeStreetAddress({
        street: "123 Main St",
        city: "Clay",
        state: "wv",
        zip: "25043",
      }),
      "123 Main St, Clay, WV 25043",
    );
  });

  it("parses composed addresses back into parts", () => {
    assert.deepEqual(parseStreetAddress("123 Main St, Clay, WV 25043"), {
      street: "123 Main St",
      city: "Clay",
      state: "WV",
      zip: "25043",
    });
  });

  it("falls back to street-only for unstructured text", () => {
    assert.deepEqual(parseStreetAddress("Near the old mill"), {
      street: "Near the old mill",
      city: "",
      state: "",
      zip: "",
    });
  });

  it("detects a complete address", () => {
    assert.equal(
      isCompleteStreetAddress({
        street: "123 Main St",
        city: "Clay",
        state: "WV",
        zip: "25043",
      }),
      true,
    );
    assert.equal(
      isCompleteStreetAddress({
        street: "123 Main St",
        city: "",
        state: "",
        zip: "25043",
      }),
      false,
    );
  });
});
