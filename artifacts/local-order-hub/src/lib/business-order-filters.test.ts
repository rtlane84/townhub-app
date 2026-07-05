import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@workspace/api-client-react";
import {
  applyBusinessOrderListFilters,
  countActiveOrdersOutsideDateRange,
  filterOrdersForQueueSummary,
  filterOrdersByDateView,
  filterOrdersBySearch,
  filterOrdersByStatus,
  getOrderListDateSummary,
  getOrderListEmptyState,
  hasActiveBusinessOrderFilters,
  isActiveOrderStatus,
  orderMatchesSearch,
} from "./business-order-filters.ts";

const now = new Date("2026-06-24T15:00:00.000Z");

function order(overrides: Partial<Order> & Pick<Order, "id" | "status">): Order {
  return {
    businessId: 1,
    businessName: "Clay Diner",
    fulfillmentType: "PICKUP",
    customerName: "Alex Rivera",
    customerEmail: "alex@example.com",
    customerPhone: "+15555550100",
    orderNumber: "TH-1001",
    total: 12,
    createdAt: "2026-06-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("business-order-filters", () => {
  it("identifies active vs history statuses", () => {
    assert.equal(isActiveOrderStatus("PREPARING"), true);
    assert.equal(isActiveOrderStatus("COMPLETED"), false);
  });

  it("today view filters by order date for every status", () => {
    const orders = [
      order({ id: 1, status: "PREPARING", createdAt: "2026-06-10T12:00:00.000Z" }),
      order({ id: 2, status: "COMPLETED", createdAt: "2026-06-24T10:00:00.000Z" }),
      order({ id: 3, status: "COMPLETED", createdAt: "2026-06-20T10:00:00.000Z" }),
      order({ id: 4, status: "NEW", createdAt: "2026-06-24T11:00:00.000Z" }),
    ];

    const filtered = filterOrdersByDateView(orders, "today", {}, now);
    assert.deepEqual(
      filtered.map((item) => item.id),
      [4, 2],
    );
  });

  it("custom range without dates shows all orders until range is set", () => {
    const orders = [
      order({ id: 1, status: "NEW", createdAt: "2026-06-01T10:00:00.000Z" }),
      order({ id: 2, status: "COMPLETED", createdAt: "2026-06-24T10:00:00.000Z" }),
    ];

    const filtered = filterOrdersByDateView(orders, "custom", {}, now);
    assert.deepEqual(
      filtered.map((item) => item.id),
      [2, 1],
    );
  });

  it("all preset includes older completed and cancelled orders", () => {
    const orders = [
      order({ id: 1, status: "COMPLETED", createdAt: "2026-01-01T10:00:00.000Z" }),
      order({ id: 2, status: "CANCELED", createdAt: "2026-06-24T10:00:00.000Z" }),
    ];

    const filtered = filterOrdersByDateView(orders, "all", {}, now);
    assert.equal(filtered.length, 2);
  });

  it("last7 filters by order date only", () => {
    const orders = [
      order({ id: 1, status: "NEW", createdAt: "2026-06-01T10:00:00.000Z" }),
      order({ id: 2, status: "COMPLETED", createdAt: "2026-06-22T10:00:00.000Z" }),
      order({ id: 3, status: "COMPLETED", createdAt: "2026-06-01T10:00:00.000Z" }),
    ];

    const filtered = filterOrdersByDateView(orders, "last7", {}, now);
    assert.deepEqual(
      filtered.map((item) => item.id),
      [2],
    );
  });

  it("queue summary scope applies date and search but not status filter", () => {
    const orders = [
      order({ id: 1, status: "NEW", createdAt: "2026-06-24T12:00:00.000Z" }),
      order({ id: 2, status: "CONFIRMED", createdAt: "2026-06-24T13:00:00.000Z" }),
      order({ id: 3, status: "NEW", createdAt: "2026-06-20T12:00:00.000Z" }),
      order({ id: 4, status: "PREPARING", customerName: "Jamie Lee", createdAt: "2026-06-24T14:00:00.000Z" }),
    ];

    const scoped = filterOrdersForQueueSummary(orders, {
      datePreset: "today",
      customRange: {},
      searchQuery: "jamie",
      now,
    });

    assert.deepEqual(
      scoped.map((item) => item.id),
      [4],
    );
  });

  it("status and search filters compose with date filtering", () => {
    const orders = [
      order({ id: 1, status: "NEW", customerName: "Alex Rivera" }),
      order({ id: 2, status: "COMPLETED", customerName: "Jamie Lee", createdAt: "2026-06-24T11:00:00.000Z" }),
      order({ id: 3, status: "NEW", customerName: "Jamie Lee", orderNumber: "TH-9999" }),
    ];

    const searched = applyBusinessOrderListFilters(orders, {
      datePreset: "today",
      customRange: {},
      statusFilter: "NEW",
      searchQuery: "jamie",
      now,
    });

    assert.deepEqual(
      searched.map((item) => item.id),
      [3],
    );
  });

  it("date summary notes active queue orders outside the selected range", () => {
    const orders = [
      order({ id: 1, status: "NEW", createdAt: "2026-06-01T10:00:00.000Z" }),
      order({ id: 2, status: "COMPLETED", createdAt: "2026-06-24T10:00:00.000Z" }),
    ];

    const summary = getOrderListDateSummary(
      "today",
      {},
      countActiveOrdersOutsideDateRange(orders, "today", {}, now),
    );

    assert.match(summary, /active order.*outside this range/i);
  });

  it("search matches order number, customer, email, and phone", () => {
    const sample = order({ id: 1, status: "NEW" });
    assert.equal(orderMatchesSearch(sample, "th-1001"), true);
    assert.equal(orderMatchesSearch(sample, "alex"), true);
    assert.equal(orderMatchesSearch(sample, "alex@example.com"), true);
    assert.equal(orderMatchesSearch(sample, "555-0100"), true);
    assert.equal(orderMatchesSearch(sample, "unknown"), false);
  });

  it("detects when filters differ from defaults", () => {
    assert.equal(
      hasActiveBusinessOrderFilters({
        statusFilter: "all",
        datePreset: "today",
        searchQuery: "",
        customRange: {},
      }),
      false,
    );
    assert.equal(
      hasActiveBusinessOrderFilters({
        statusFilter: "NEW",
        datePreset: "today",
        searchQuery: "",
        customRange: {},
      }),
      true,
    );
  });

  it("empty state distinguishes no orders vs no matches", () => {
    assert.equal(
      getOrderListEmptyState({ totalOrders: 0, searchQuery: "", statusFilter: "all", datePreset: "today" }).title,
      "No orders yet",
    );
    assert.match(
      getOrderListEmptyState({ totalOrders: 5, searchQuery: "zzz", statusFilter: "all", datePreset: "today" })
        .description,
      /zzz/,
    );
  });
});
