import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOrderAccessQuery, orderConfirmationPath } from "./order-access.ts";

describe("order access URL helpers", () => {
  it("builds confirmation paths with encoded tokens", () => {
    const token = "abc+def/token";
    assert.equal(
      orderConfirmationPath(12, token),
      `/order/12?token=${encodeURIComponent(token)}`,
    );
    assert.equal(buildOrderAccessQuery(null), "");
    assert.equal(buildOrderAccessQuery(undefined), "");
  });
});
