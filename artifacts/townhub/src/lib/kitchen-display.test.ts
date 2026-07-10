import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@workspace/api-client-react";
import {
  applyKitchenDisplayFilters,
  filterActiveKitchenOrders,
  getKitchenQuickAction,
  groupOrdersByKitchenColumn,
  groupOrdersByKitchenMobileColumn,
  isActiveKitchenOrder,
} from "./kitchen-display.ts";

function order(partial: Partial<Order> & Pick<Order, "id" | "status">): Order {
  return {
    businessId: 1,
    businessName: "Test",
    customerName: "Pat",
    customerEmail: "pat@example.com",
    total: 10,
    fulfillmentType: "PICKUP",
    createdAt: "2026-06-24T12:00:00.000Z",
    ...partial,
  };
}

describe("kitchen-display", () => {
  it("isActiveKitchenOrder hides completed and canceled orders", () => {
    assert.equal(isActiveKitchenOrder(order({ id: 1, status: "NEW" })), true);
    assert.equal(isActiveKitchenOrder(order({ id: 2, status: "COMPLETED" })), false);
    assert.equal(isActiveKitchenOrder(order({ id: 3, status: "CANCELED" })), false);
  });

  it("groupOrdersByKitchenColumn buckets active orders into kitchen columns", () => {
    const grouped = groupOrdersByKitchenColumn([
      order({ id: 1, status: "NEW" }),
      order({ id: 2, status: "CONFIRMED" }),
      order({ id: 3, status: "PREPARING" }),
      order({ id: 4, status: "READY_FOR_PICKUP" }),
      order({ id: 5, status: "OUT_FOR_DELIVERY", fulfillmentType: "DELIVERY" }),
      order({ id: 6, status: "COMPLETED" }),
    ]);

    assert.equal(grouped.NEW.length, 1);
    assert.equal(grouped.CONFIRMED.length, 1);
    assert.equal(grouped.PREPARING.length, 1);
    assert.equal(grouped.READY.length, 2);
    assert.equal(filterActiveKitchenOrders([order({ id: 6, status: "COMPLETED" })]).length, 0);
  });

  it("prioritizes sooner estimated ready windows within a kitchen column", () => {
    const grouped = groupOrdersByKitchenColumn([
      order({
        id: 1,
        status: "NEW",
        estimatedWindowEnd: "2026-06-24T12:45:00.000Z",
      }),
      order({
        id: 2,
        status: "NEW",
        estimatedWindowEnd: "2026-06-24T12:20:00.000Z",
      }),
    ]);

    assert.deepEqual(grouped.NEW.map((entry) => entry.id), [2, 1]);
  });

  it("getKitchenQuickAction advances pickup and delivery orders correctly", () => {
    assert.deepEqual(getKitchenQuickAction(order({ id: 1, status: "NEW" })), {
      label: "Confirm order",
      nextStatus: "CONFIRMED",
    });
    assert.deepEqual(
      getKitchenQuickAction(order({ id: 2, status: "PREPARING", fulfillmentType: "DELIVERY" })),
      { label: "Out for delivery", nextStatus: "OUT_FOR_DELIVERY" },
    );
    assert.deepEqual(
      getKitchenQuickAction(order({ id: 3, status: "PREPARING", fulfillmentType: "PICKUP" })),
      { label: "Ready for pickup", nextStatus: "READY_FOR_PICKUP" },
    );
    assert.deepEqual(
      getKitchenQuickAction(order({ id: 4, status: "READY_FOR_PICKUP" })),
      { label: "Complete order", nextStatus: "COMPLETED" },
    );
  });

  it("groupOrdersByKitchenMobileColumn splits ready and out-for-delivery on mobile", () => {
    const grouped = groupOrdersByKitchenMobileColumn([
      order({ id: 1, status: "READY_FOR_PICKUP" }),
      order({ id: 2, status: "OUT_FOR_DELIVERY", fulfillmentType: "DELIVERY" }),
    ]);

    assert.equal(grouped.READY_FOR_PICKUP.length, 1);
    assert.equal(grouped.OUT_FOR_DELIVERY.length, 1);
  });

  it("applyKitchenDisplayFilters combines date, search, fulfillment, and payment filters", () => {
    const orders = [
      order({ id: 1, status: "NEW", customerName: "Alice", fulfillmentType: "PICKUP", paymentMethod: "STRIPE", paymentStatus: "PAID" }),
      order({ id: 2, status: "CONFIRMED", customerName: "Bob", fulfillmentType: "DELIVERY", paymentMethod: "IN_PERSON", paymentStatus: "PENDING" }),
      order({ id: 3, status: "PREPARING", customerName: "Carol", fulfillmentType: "PICKUP", createdAt: "2026-06-01T12:00:00.000Z" }),
      order({ id: 4, status: "COMPLETED", customerName: "Done" }),
    ];

    const now = new Date("2026-06-24T12:00:00.000Z");
    const filtered = applyKitchenDisplayFilters(orders, {
      datePreset: "today",
      searchQuery: "",
      fulfillmentFilter: "PICKUP",
      paymentFilter: "all",
      now,
    });

    assert.deepEqual(filtered.map((o) => o.id), [1]);

    const bySearch = applyKitchenDisplayFilters(orders, {
      datePreset: "all",
      searchQuery: "bob",
      fulfillmentFilter: "all",
      paymentFilter: "all",
      now,
    });
    assert.deepEqual(bySearch.map((o) => o.id), [2]);

    const byPayment = applyKitchenDisplayFilters(orders, {
      datePreset: "all",
      searchQuery: "",
      fulfillmentFilter: "all",
      paymentFilter: "PAY AT PICKUP",
      now,
    });
    assert.deepEqual(byPayment.map((o) => o.id), [2]);
  });
});
