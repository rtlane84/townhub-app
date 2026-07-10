import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@workspace/api-client-react";
import {
  detectOrderListChanges,
  orderListsEqual,
  orderSummariesEqual,
} from "./order-dashboard-sync.ts";

function order(overrides: Partial<Order> & Pick<Order, "id">): Order {
  return {
    businessId: 1,
    businessName: "Test Shop",
    status: "NEW",
    fulfillmentType: "PICKUP",
    customerName: "Alex",
    customerEmail: "alex@example.com",
    total: 12.5,
    ...overrides,
  };
}

describe("order-dashboard-sync", () => {
  it("detectOrderListChanges finds new and updated orders", () => {
    const previous = [order({ id: 1, status: "NEW" }), order({ id: 2, status: "CONFIRMED" })];
    const next = [order({ id: 3, status: "NEW" }), order({ id: 2, status: "PREPARING" }), order({ id: 1, status: "NEW" })];

    const changes = detectOrderListChanges(previous, next);
    assert.deepEqual(changes.newOrderIds, [3]);
    assert.deepEqual(changes.updatedOrderIds, [2]);
    assert.equal(changes.hasChanges, true);
  });

  it("orderListsEqual compares row signatures", () => {
    const a = [order({ id: 1 }), order({ id: 2, status: "CONFIRMED" })];
    const b = [order({ id: 1 }), order({ id: 2, status: "CONFIRMED" })];
    const c = [order({ id: 1 }), order({ id: 2, status: "PREPARING" })];

    assert.equal(orderListsEqual(a, b), true);
    assert.equal(orderListsEqual(a, c), false);
  });

  it("orderSummariesEqual compares stats and recent orders", () => {
    const a = {
      todayCount: 2,
      pendingCount: 1,
      todayRevenue: 25,
      upcomingCount: 0,
      recentOrders: [order({ id: 1 })],
    };
    const b = {
      todayCount: 2,
      pendingCount: 1,
      todayRevenue: 25,
      upcomingCount: 0,
      recentOrders: [order({ id: 1 })],
    };
    const c = {
      ...b,
      pendingCount: 2,
    };

    assert.equal(orderSummariesEqual(a, b), true);
    assert.equal(orderSummariesEqual(a, c), false);
  });
});
