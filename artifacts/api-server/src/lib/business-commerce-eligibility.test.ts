import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBusinessOpenForPublicCommerce } from "./business-commerce-eligibility";

describe("isBusinessOpenForPublicCommerce", () => {
  it("accepts active, non-archived businesses", () => {
    assert.equal(isBusinessOpenForPublicCommerce({ active: true, archivedAt: null }), true);
  });

  it("rejects inactive businesses", () => {
    assert.equal(isBusinessOpenForPublicCommerce({ active: false, archivedAt: null }), false);
  });

  it("rejects archived businesses", () => {
    assert.equal(
      isBusinessOpenForPublicCommerce({ active: true, archivedAt: new Date() }),
      false,
    );
  });
});
