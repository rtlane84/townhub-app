import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { asArray } from "./as-array.ts";

describe("asArray", () => {
  it("returns arrays unchanged", () => {
    const input = [{ id: 1 }];
    assert.equal(asArray(input), input);
  });

  it("coerces non-arrays to empty", () => {
    assert.deepEqual(asArray(undefined), []);
    assert.deepEqual(asArray(null), []);
    assert.deepEqual(asArray({ data: [1] }), []);
    assert.deepEqual(asArray("[{}]"), []);
  });
});
