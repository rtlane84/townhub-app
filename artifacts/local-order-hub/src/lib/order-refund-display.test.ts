import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canIssueRefund,
  customerRefundSummary,
  orderPaymentDisplayStatus,
  refundStatusLabel,
} from "./order-refund-display.ts";

describe("order refund display", () => {
  it("shows paid status for online paid orders without refunds", () => {
    assert.equal(
      orderPaymentDisplayStatus({
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        refundStatus: "NONE",
        refundedAmount: 0,
      }),
      "Paid",
    );
  });

  it("shows partial refund status", () => {
    assert.equal(
      orderPaymentDisplayStatus({
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        refundStatus: "PARTIAL",
        refundedAmount: 5,
      }),
      "Partially refunded ($5.00 refunded)",
    );
  });

  it("shows customer refund summary without internal notes", () => {
    assert.equal(
      customerRefundSummary({ refundStatus: "FULL", refundedAmount: 10 }),
      "Refunded: full amount refunded",
    );
    assert.equal(
      customerRefundSummary({ refundStatus: "PARTIAL", refundedAmount: 5 }),
      "Partially refunded: $5.00 refunded",
    );
    assert.equal(customerRefundSummary({ refundStatus: "NONE", refundedAmount: 0 }), null);
  });

  it("allows refund only for paid online orders with remaining balance", () => {
    assert.equal(
      canIssueRefund({
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        refundStatus: "NONE",
        refundableAmount: 8.5,
      }),
      true,
    );
    assert.equal(
      canIssueRefund({
        paymentMethod: "IN_PERSON",
        paymentStatus: "PAID",
        refundStatus: "NONE",
        refundableAmount: 8.5,
      }),
      false,
    );
    assert.equal(
      canIssueRefund({
        paymentMethod: "STRIPE",
        paymentStatus: "PAID",
        refundStatus: "FULL",
        refundableAmount: 0,
      }),
      false,
    );
  });

  it("maps refund status labels for business hub", () => {
    assert.equal(refundStatusLabel("PARTIAL"), "Partially refunded");
    assert.equal(refundStatusLabel("FULL"), "Fully refunded");
    assert.equal(refundStatusLabel("FAILED"), "Refund failed");
    assert.equal(refundStatusLabel("NONE"), "Paid");
  });
});
