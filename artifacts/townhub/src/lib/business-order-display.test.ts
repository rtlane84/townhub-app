import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@workspace/api-client-react";
import {
  computeQueueCounts,
  customerPhoneTelHref,
  formatOrderRelativeTime,
  getBusinessOrderPaymentFlag,
} from "./business-order-display.ts";

describe("business-order-display", () => {
  it("formatOrderRelativeTime shows minutes ago for recent orders", () => {
    const now = new Date("2026-06-24T12:00:00Z");
    assert.equal(formatOrderRelativeTime(new Date("2026-06-24T11:58:00Z"), now), "2 min ago");
    assert.equal(formatOrderRelativeTime(new Date("2026-06-24T11:42:00Z"), now), "18 min ago");
  });

  it("formatOrderRelativeTime shows today, yesterday, then date", () => {
    const now = new Date("2026-06-24T15:00:00Z");
    assert.match(formatOrderRelativeTime(new Date("2026-06-24T11:42:00Z"), now), /^Today /);
    assert.equal(formatOrderRelativeTime(new Date("2026-06-23T18:00:00Z"), now), "Yesterday");
    assert.equal(formatOrderRelativeTime(new Date("2026-06-20T18:00:00Z"), now), "Jun 20, 2026");
  });

  it("getBusinessOrderPaymentFlag maps payment states for the list", () => {
    assert.equal(getBusinessOrderPaymentFlag("IN_PERSON", "PENDING"), "PAY AT PICKUP");
    assert.equal(getBusinessOrderPaymentFlag("STRIPE", "PAID"), "PAID");
    assert.equal(getBusinessOrderPaymentFlag("STRIPE", "PENDING"), "PENDING");
    assert.equal(getBusinessOrderPaymentFlag("STRIPE", "REFUNDED"), "REFUNDED");
    assert.equal(getBusinessOrderPaymentFlag("STRIPE", "FAILED"), "FAILED");
  });

  it("customerPhoneTelHref normalizes phone numbers for tel links", () => {
    assert.equal(customerPhoneTelHref("+1 (555) 555-0100"), "tel:+15555550100");
  });

  it("computeQueueCounts totals orders by active queue status for the business list", () => {
    const orders = [
      { status: "NEW" },
      { status: "NEW" },
      { status: "CONFIRMED" },
      { status: "PREPARING" },
      { status: "COMPLETED" },
    ] as Order[];

    assert.deepEqual(computeQueueCounts(orders), {
      NEW: 2,
      CONFIRMED: 1,
      PREPARING: 1,
      READY_FOR_PICKUP: 0,
      OUT_FOR_DELIVERY: 0,
    });
  });
});
