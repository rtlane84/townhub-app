import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeBusinessOwnerAccess } from "./business-owner-access.ts";

describe("authorizeBusinessOwnerAccess", () => {
  it("allows admins to access any business", () => {
    const result = authorizeBusinessOwnerAccess({
      userId: "admin-user",
      userRole: "ADMIN",
      businessOwnerId: "other-owner",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.isAdmin, true);
  });

  it("allows the business owner to access their own business", () => {
    const result = authorizeBusinessOwnerAccess({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-1",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.isAdmin, false);
  });

  it("denies a business owner accessing another user's business", () => {
    const result = authorizeBusinessOwnerAccess({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-2",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.match(result.error, /business owner access required/i);
    }
  });

  it("denies customers from managing a business", () => {
    const result = authorizeBusinessOwnerAccess({
      userId: "customer-1",
      userRole: "CUSTOMER",
      businessOwnerId: "owner-1",
    });
    assert.equal(result.ok, false);
  });
});
