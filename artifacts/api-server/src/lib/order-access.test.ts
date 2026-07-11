import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeOrderStatusUpdate } from "./order-access";

describe("authorizeOrderStatusUpdate", () => {
  it("allows admins to update any order", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "admin-user",
      userRole: "ADMIN",
      businessOwnerId: "other-owner",
    });
    assert.equal(result.allowed, true);
  });

  it("allows the business owner to update their own orders", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-1",
    });
    assert.equal(result.allowed, true);
  });

  it("denies a business owner updating another business's order", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-2",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.statusCode, 403);
      assert.match(result.error, /do not own the business/i);
    }
  });

  it("denies customers from updating order status", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "customer-1",
      userRole: "CUSTOMER",
      businessOwnerId: "owner-1",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.statusCode, 403);
    }
  });

  it("denies updates when the business has no owner assigned", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: null,
    });
    assert.equal(result.allowed, false);
  });

  it("denies updates when the user record is missing a role", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "ghost-user",
      userRole: null,
      businessOwnerId: "ghost-user",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.statusCode, 403);
      assert.match(result.error, /user not found/i);
    }
  });
});
