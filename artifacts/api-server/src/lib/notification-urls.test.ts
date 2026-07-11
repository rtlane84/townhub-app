import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  customerOrderUrl,
  customerOrderUrlForNotification,
} from "./notification-urls";

describe("customer order notification URLs", () => {
  const previous = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-order-access-secret-with-32-chars-min";
    process.env.APP_BASE_URL = "https://townhub.test";
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
    delete process.env.APP_BASE_URL;
  });

  it("appends token query param when accessToken is provided", () => {
    const url = customerOrderUrl(42, { accessToken: "abc123" });
    assert.equal(url, "https://townhub.test/order/42?token=abc123");
  });

  it("includes access token for guest orders in notification links", () => {
    const url = customerOrderUrlForNotification({ orderId: 42, customerUserId: null });
    assert.match(url, /^https:\/\/townhub\.test\/order\/42\?token=/);
  });

  it("omits access token for signed-in customer orders", () => {
    const url = customerOrderUrlForNotification({
      orderId: 42,
      customerUserId: "user_abc",
    });
    assert.equal(url, "https://townhub.test/order/42");
    assert.doesNotMatch(url, /token=/);
  });
});
