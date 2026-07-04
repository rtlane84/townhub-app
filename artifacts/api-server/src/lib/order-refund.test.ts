import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAggregateRefundStatus,
  evaluateRefundEligibility,
  mapStripeRefundStatus,
  orderTotalCents,
  validateRefundAmount,
} from "./order-refund-logic";
import { authorizeOrderStatusUpdate } from "./order-access";

function paidOnlineOrder(overrides: Record<string, unknown> = {}) {
  return {
    paymentMethod: "STRIPE",
    paymentStatus: "PAID",
    total: "10.00",
    refundedAmountCents: 0,
    refundStatus: "NONE" as const,
    stripeSessionId: "cs_test_123",
    stripeConnectedAccountId: "acct_test",
    stripePaymentIntentId: "pi_test_123",
    ...overrides,
  };
}

describe("evaluateRefundEligibility", () => {
  it("allows paid online Stripe orders with remaining balance", () => {
    const result = evaluateRefundEligibility(paidOnlineOrder());
    assert.equal(result.eligible, true);
    if (result.eligible) {
      assert.equal(result.remainingCents, 1000);
    }
  });

  it("blocks pay-at-pickup orders", () => {
    const result = evaluateRefundEligibility(
      paidOnlineOrder({ paymentMethod: "IN_PERSON", paymentStatus: "PENDING" }),
    );
    assert.equal(result.eligible, false);
    if (!result.eligible) {
      assert.equal(result.statusCode, 400);
      assert.match(result.error, /online card/i);
    }
  });

  it("blocks unpaid orders", () => {
    const result = evaluateRefundEligibility(
      paidOnlineOrder({ paymentStatus: "PENDING" }),
    );
    assert.equal(result.eligible, false);
  });

  it("blocks fully refunded orders", () => {
    const result = evaluateRefundEligibility(
      paidOnlineOrder({ refundStatus: "FULL", refundedAmountCents: 1000 }),
    );
    assert.equal(result.eligible, false);
  });
});

describe("validateRefundAmount", () => {
  it("rejects zero or negative amounts", () => {
    assert.equal(validateRefundAmount(0, 500).ok, false);
    assert.equal(validateRefundAmount(-100, 500).ok, false);
  });

  it("rejects amounts above remaining balance", () => {
    const result = validateRefundAmount(600, 500);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /exceeds/i);
    }
  });

  it("accepts valid partial and full amounts", () => {
    assert.equal(validateRefundAmount(500, 500).ok, true);
    assert.equal(validateRefundAmount(250, 500).ok, true);
  });
});

describe("computeAggregateRefundStatus", () => {
  it("returns PARTIAL for partial refunds", () => {
    assert.equal(computeAggregateRefundStatus(1000, 500, false), "PARTIAL");
  });

  it("returns FULL when refunded amount meets order total", () => {
    assert.equal(computeAggregateRefundStatus(1000, 1000, false), "FULL");
  });

  it("returns FAILED when no refund succeeded but an attempt failed", () => {
    assert.equal(computeAggregateRefundStatus(1000, 0, true), "FAILED");
  });
});

describe("authorizeOrderRefund", () => {
  it("allows business owners for their own orders", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-1",
    });
    assert.equal(result.allowed, true);
  });

  it("allows admins for any order", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "admin-1",
      userRole: "ADMIN",
      businessOwnerId: "owner-2",
    });
    assert.equal(result.allowed, true);
  });

  it("blocks non-owners", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "owner-1",
      userRole: "BUSINESS_OWNER",
      businessOwnerId: "owner-2",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.statusCode, 403);
    }
  });

  it("blocks unauthenticated users", () => {
    const result = authorizeOrderStatusUpdate({
      userId: "ghost",
      userRole: null,
      businessOwnerId: "owner-1",
    });
    assert.equal(result.allowed, false);
  });
});

describe("orderTotalCents", () => {
  it("converts decimal totals to cents", () => {
    assert.equal(orderTotalCents({ total: "8.50" }), 850);
    assert.equal(orderTotalCents({ total: "10.00" }), 1000);
  });
});

describe("mapStripeRefundStatus", () => {
  it("maps Stripe refund statuses", () => {
    assert.equal(mapStripeRefundStatus("succeeded"), "SUCCEEDED");
    assert.equal(mapStripeRefundStatus("failed"), "FAILED");
    assert.equal(mapStripeRefundStatus("pending"), "PENDING");
  });
});

describe("refund route protection", () => {
  it("requires auth on POST /orders/:id/refund", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../routes/orders.ts", import.meta.url), "utf8");
    assert.match(source, /\/orders\/:id\/refund[\s\S]*requireAuth/);
    assert.match(source, /authorizeOrderRefund/);
  });
});

describe("idempotency protection", () => {
  it("documents pending-refund guard in createOrderRefund source", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("./order-refund.ts", import.meta.url), "utf8");
    assert.match(source, /hasPendingRefund/);
    assert.match(source, /idempotencyKey/);
  });
});
