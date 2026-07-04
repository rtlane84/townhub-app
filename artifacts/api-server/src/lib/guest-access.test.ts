import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authorizeOrderStatusUpdate } from "./order-access";

describe("guest checkout dashboard access", () => {
  it("denies unsigned callers from updating order status", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "",
      userRole: "CUSTOMER",
      businessOwnerId: "owner_1",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.statusCode, 403);
  });

  it("denies customers from updating order status", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "user_customer",
      userRole: "CUSTOMER",
      businessOwnerId: "owner_1",
    });
    assert.equal(result.allowed, false);
    assert.equal(result.statusCode, 403);
  });

  it("route guards keep business order APIs behind auth in source", async () => {
    const ordersSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/orders.ts", import.meta.url), "utf8"),
    );
    assert.match(ordersSource, /authorizeBusinessOwnerOrAdmin/);
    assert.match(ordersSource, /\/businesses\/:businessId\/orders[\s\S]*requireAuth/);
    assert.match(ordersSource, /\/me\/orders[\s\S]*requireAuth/);
    assert.match(ordersSource, /authorizeOrderAccess/);
  });
});
