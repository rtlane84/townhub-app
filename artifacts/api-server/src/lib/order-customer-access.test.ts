import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeOrderView } from "./order-customer-access";

describe("authorizeOrderView", () => {
  it("allows guest orders to be viewed without signing in", () => {
    const result = authorizeOrderView({
      viewerUserId: null,
      viewerRole: null,
      businessOwnerId: null,
      orderCustomerUserId: null,
    });
    assert.equal(result.allowed, true);
  });

  it("allows the linked customer to view their order", () => {
    const result = authorizeOrderView({
      viewerUserId: "user_customer",
      viewerRole: "CUSTOMER",
      businessOwnerId: null,
      orderCustomerUserId: "user_customer",
    });
    assert.equal(result.allowed, true);
  });

  it("denies another customer from viewing a linked order", () => {
    const result = authorizeOrderView({
      viewerUserId: "user_other",
      viewerRole: "CUSTOMER",
      businessOwnerId: null,
      orderCustomerUserId: "user_customer",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.statusCode, 403);
  });

  it("allows business owners to view orders for their business", () => {
    const result = authorizeOrderView({
      viewerUserId: "user_owner",
      viewerRole: "BUSINESS_OWNER",
      businessOwnerId: "user_owner",
      orderCustomerUserId: "user_customer",
    });
    assert.equal(result.allowed, true);
  });

  it("allows admins to view any linked order", () => {
    const result = authorizeOrderView({
      viewerUserId: "user_admin",
      viewerRole: "ADMIN",
      businessOwnerId: null,
      orderCustomerUserId: "user_customer",
    });
    assert.equal(result.allowed, true);
  });
});
