import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDynamicImportFailure } from "./lazy-with-retry.ts";

describe("isDynamicImportFailure", () => {
  it("detects MIME and chunk load failures", () => {
    assert.equal(
      isDynamicImportFailure(
        new TypeError("'text/html' is not a valid JavaScript MIME type."),
      ),
      true,
    );
    assert.equal(
      isDynamicImportFailure(
        new Error("Failed to fetch dynamically imported module: https://x/a.js"),
      ),
      true,
    );
    assert.equal(isDynamicImportFailure(new Error("Network error")), false);
  });
});
