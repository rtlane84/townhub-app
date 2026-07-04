import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOwnerMediaBusinessId } from "./media-scope";

describe("resolveOwnerMediaBusinessId", () => {
  it("requires business owners to specify a business they own", () => {
    assert.equal(
      resolveOwnerMediaBusinessId({
        role: "BUSINESS_OWNER",
        ownedBusinessIds: [10, 20],
        requestedBusinessId: undefined,
      }),
      null,
    );
    assert.deepEqual(
      resolveOwnerMediaBusinessId({
        role: "BUSINESS_OWNER",
        ownedBusinessIds: [10, 20],
        requestedBusinessId: 20,
      }),
      { kind: "business", businessId: 20 },
    );
    assert.equal(
      resolveOwnerMediaBusinessId({
        role: "BUSINESS_OWNER",
        ownedBusinessIds: [10, 20],
        requestedBusinessId: 99,
      }),
      null,
    );
  });

  it("allows admins to upload platform or business-scoped media", () => {
    assert.deepEqual(
      resolveOwnerMediaBusinessId({
        role: "ADMIN",
        ownedBusinessIds: [],
        requestedBusinessId: undefined,
      }),
      { kind: "platform" },
    );
    assert.deepEqual(
      resolveOwnerMediaBusinessId({
        role: "ADMIN",
        ownedBusinessIds: [],
        requestedBusinessId: 5,
      }),
      { kind: "business", businessId: 5 },
    );
  });

  it("denies customers", () => {
    assert.equal(
      resolveOwnerMediaBusinessId({
        role: "CUSTOMER",
        ownedBusinessIds: [],
        requestedBusinessId: 1,
      }),
      null,
    );
  });
});
