import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  countKitchenPanelActiveFilters,
  countOrdersPanelActiveFilters,
  DEFAULT_KITCHEN_WORKSPACE,
  DEFAULT_ORDERS_WORKSPACE,
  kitchenWorkspaceHasActiveFilters,
  ordersWorkspaceHasActiveFilters,
  readKitchenWorkspace,
  readOrdersWorkspace,
  writeKitchenWorkspace,
  writeOrdersWorkspace,
} from "./business-order-workspace.ts";

describe("business-order-workspace", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    globalThis.localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    };
    storage.clear();
  });

  afterEach(() => {
    delete globalThis.localStorage;
    storage.clear();
  });

  it("counts active panel filters for orders and kitchen", () => {
    assert.equal(
      countOrdersPanelActiveFilters({
        datePreset: "today",
        customRange: {},
        statusFilter: "all",
        fulfillmentFilter: "all",
        paymentFilter: "all",
      }),
      0,
    );
    assert.equal(
      countOrdersPanelActiveFilters({
        datePreset: "last7",
        customRange: {},
        statusFilter: "NEW",
        fulfillmentFilter: "PICKUP",
        paymentFilter: "PAID",
      }),
      4,
    );
    assert.equal(
      countKitchenPanelActiveFilters({
        datePreset: "month",
        customRange: {},
        fulfillmentFilter: "DELIVERY",
        paymentFilter: "all",
      }),
      2,
    );
  });

  it("treats search as active for clear-filters state", () => {
    assert.equal(
      ordersWorkspaceHasActiveFilters({
        ...DEFAULT_ORDERS_WORKSPACE,
        searchQuery: "alex",
      }),
      true,
    );
    assert.equal(
      kitchenWorkspaceHasActiveFilters({
        ...DEFAULT_KITCHEN_WORKSPACE,
        searchQuery: "",
        datePreset: "today",
      }),
      false,
    );
  });

  it("persists and restores orders workspace per business", () => {
    writeOrdersWorkspace(7, {
      ...DEFAULT_ORDERS_WORKSPACE,
      searchQuery: "TH-12",
      statusFilter: "PREPARING",
      filtersExpanded: true,
      scrollY: 240,
    });

    assert.deepEqual(readOrdersWorkspace(7), {
      ...DEFAULT_ORDERS_WORKSPACE,
      searchQuery: "TH-12",
      statusFilter: "PREPARING",
      filtersExpanded: true,
      scrollY: 240,
    });
    assert.deepEqual(readOrdersWorkspace(8), { ...DEFAULT_ORDERS_WORKSPACE });
  });

  it("persists and restores kitchen workspace per business", () => {
    writeKitchenWorkspace(3, {
      ...DEFAULT_KITCHEN_WORKSPACE,
      datePreset: "all",
      paymentFilter: "PENDING",
      mobileBoardScrollLeft: 390,
      filtersExpanded: true,
    });

    assert.deepEqual(readKitchenWorkspace(3), {
      ...DEFAULT_KITCHEN_WORKSPACE,
      datePreset: "all",
      paymentFilter: "PENDING",
      mobileBoardScrollLeft: 390,
      filtersExpanded: true,
    });
  });
});
