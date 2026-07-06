import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { testDeliveryHttpError } from "./notification-test-outcome.ts";

describe("notification-test-outcome", () => {
  it("returns null for successful delivery", () => {
    assert.equal(testDeliveryHttpError({ status: "SENT" }), null);
  });

  it("maps logged deliveries to provider-unavailable", () => {
    const failure = testDeliveryHttpError({ status: "LOGGED" });
    assert.equal(failure?.status, 503);
  });

  it("maps failed deliveries to bad gateway with error text", () => {
    const failure = testDeliveryHttpError({ status: "FAILED", error: "Webhook rejected" });
    assert.equal(failure?.status, 502);
    assert.match(failure?.message ?? "", /Webhook rejected/);
  });
});
