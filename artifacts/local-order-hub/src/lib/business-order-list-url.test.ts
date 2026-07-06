import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrdersPageHref,
  OVERVIEW_ORDERS_LINKS,
  parseOrdersPageSearch,
} from "./business-order-list-url.ts";

describe("business-order-list-url", () => {
  it("builds and parses orders page query params", () => {
    const href = buildOrdersPageHref({ datePreset: "today", statusFilter: "COMPLETED" });
    assert.equal(href, "/dashboard/business/orders?date=today&status=COMPLETED");
    assert.deepEqual(parseOrdersPageSearch("?date=today&status=active"), {
      datePreset: "today",
      statusFilter: "active",
    });
  });

  it("defines overview deep links", () => {
    assert.match(OVERVIEW_ORDERS_LINKS.today, /date=today/);
    assert.match(OVERVIEW_ORDERS_LINKS.todayCompleted, /status=COMPLETED/);
    assert.match(OVERVIEW_ORDERS_LINKS.active, /status=active/);
  });
});
