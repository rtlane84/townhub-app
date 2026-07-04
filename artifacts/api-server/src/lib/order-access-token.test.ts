import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  createOrderAccessToken,
  verifyOrderAccessToken,
} from "./order-access-token";

describe("order access token", () => {
  const originalSecret = process.env.SESSION_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("creates and verifies a token for an order id", () => {
    const token = createOrderAccessToken(42);
    assert.equal(verifyOrderAccessToken(42, token), true);
    assert.equal(verifyOrderAccessToken(43, token), false);
    assert.equal(verifyOrderAccessToken(42, "invalid"), false);
    assert.equal(verifyOrderAccessToken(42, null), false);
  });
});
