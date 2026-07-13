import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ORDER_STATUS_BADGE_CLASS,
  ORDER_STATUSES,
  orderStatusBadgeClass,
} from "./order-status-colors.ts";

describe("order status colors", () => {
  it("assigns a unique badge class to every status", () => {
    const classes = ORDER_STATUSES.map((status) => ORDER_STATUS_BADGE_CLASS[status]);
    assert.equal(new Set(classes).size, ORDER_STATUSES.length);
  });

  it("keeps Ready green and Completed neutral gray", () => {
    assert.match(ORDER_STATUS_BADGE_CLASS.READY_FOR_PICKUP, /green/);
    assert.match(ORDER_STATUS_BADGE_CLASS.COMPLETED, /slate/);
    assert.doesNotMatch(ORDER_STATUS_BADGE_CLASS.COMPLETED, /green|emerald/);
  });

  it("falls back for unknown statuses", () => {
    assert.match(orderStatusBadgeClass("UNKNOWN"), /muted/);
  });
});
