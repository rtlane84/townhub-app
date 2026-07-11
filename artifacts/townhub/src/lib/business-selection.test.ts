import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSelectedBusinessId } from "./business-selection.ts";

describe("business-selection", () => {
  it("single business owner keeps the only owned business selected", () => {
    assert.equal(resolveSelectedBusinessId([42], undefined, 42), 42);
    assert.equal(resolveSelectedBusinessId([42], null, null), 42);
  });

  it("multi-business owner can switch to any owned business", () => {
    assert.equal(resolveSelectedBusinessId([1, 2, 3], 2, 1), 2);
    assert.equal(resolveSelectedBusinessId([1, 2, 3], 99, 1), 1);
  });

  it("owner cannot select another user's business id", () => {
    assert.equal(resolveSelectedBusinessId([1, 2], 99, 1), 1);
    assert.equal(resolveSelectedBusinessId([1, 2], 99, null), 1);
  });

  it("uses primary fallback when request is invalid", () => {
    assert.equal(resolveSelectedBusinessId([5, 9], undefined, 9), 9);
  });
});
