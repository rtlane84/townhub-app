import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNewOrdersSince,
  isNewOrderId,
  maxOrderId,
  resolveOrderFromList,
} from "./owner-order-alert-state.ts";

describe("owner-order-alert-state", () => {
  it("finds orders newer than the tracked watermark", () => {
    const orders = [
      { id: 8 },
      { id: 9 },
      { id: 10 },
    ] as never;

    assert.equal(maxOrderId(orders), 10);
    assert.deepEqual(findNewOrdersSince(orders, 9, new Set()).map((order) => order.id), [10]);
    assert.equal(isNewOrderId(10, 9, new Set()), true);
    assert.equal(isNewOrderId(10, 10, new Set()), false);
    assert.equal(isNewOrderId(10, 9, new Set([10])), false);
    assert.equal(resolveOrderFromList(orders, 9)?.id, 9);
  });
});
