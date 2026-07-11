import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { authorizeOrderAccess } from "./order-request-access";
import { createOrderAccessToken } from "./order-access-token";

describe("authorizeOrderAccess", () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  it("allows guest checkout when the signed token matches", () => {
    const token = createOrderAccessToken(9);
    const result = authorizeOrderAccess({
      orderId: 9,
      viewerUserId: null,
      viewerRole: null,
      businessOwnerId: null,
      orderCustomerUserId: null,
      accessToken: token,
    });
    assert.equal(result.allowed, true);
  });

  it("denies guest checkout with a missing or wrong token", () => {
    const result = authorizeOrderAccess({
      orderId: 9,
      viewerUserId: null,
      viewerRole: null,
      businessOwnerId: null,
      orderCustomerUserId: null,
      accessToken: "wrong",
    });
    assert.equal(result.allowed, false);
  });
});
