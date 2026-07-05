import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBusinessOrderSummaryPayload } from "./business-order-summary-payload";

describe("buildBusinessOrderSummaryPayload", () => {
  it("preserves the existing summary response shape", () => {
    const payload = buildBusinessOrderSummaryPayload({
      todayCount: 4,
      pendingCount: 2,
      todayRevenue: 48.5,
      recentOrders: [
        {
          id: 9,
          businessId: 1,
          businessName: "Clay Diner",
          orderNumber: "ORD-9",
          status: "NEW",
          fulfillmentType: "PICKUP",
          customerName: "Alex",
          customerEmail: "alex@example.com",
          total: 12.5,
          items: [],
        } as never,
      ],
    });

    assert.deepEqual(payload, {
      todayCount: 4,
      pendingCount: 2,
      todayRevenue: 48.5,
      upcomingCount: 2,
      recentOrders: payload.recentOrders,
    });
  });
});
