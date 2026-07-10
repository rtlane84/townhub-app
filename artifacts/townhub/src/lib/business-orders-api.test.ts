import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBusinessOrdersQueryKey,
  getKitchenBusinessOrdersQueryKey,
  KITCHEN_LIVE_ORDER_LIST_QUERY,
} from "./business-orders-query.ts";

describe("business orders api query keys", () => {
  it("uses separate keys for full history and kitchen/live scoped lists", () => {
    assert.deepEqual(getBusinessOrdersQueryKey(12), ["/api/businesses/12/orders"]);
    assert.deepEqual(getKitchenBusinessOrdersQueryKey(12), [
      "/api/businesses/12/orders",
      KITCHEN_LIVE_ORDER_LIST_QUERY,
    ]);
  });

  it("marks kitchen/live lists as active-only", () => {
    assert.deepEqual(KITCHEN_LIVE_ORDER_LIST_QUERY, { activeOnly: true });
  });
});
