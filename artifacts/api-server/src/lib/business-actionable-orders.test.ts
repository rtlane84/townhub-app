import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBusinessActionableOrder } from "./business-actionable-orders";

describe("isBusinessActionableOrder", () => {
  it("hides unpaid and processing Stripe checkouts", () => {
    assert.equal(isBusinessActionableOrder("STRIPE", "PENDING"), false);
    assert.equal(isBusinessActionableOrder(null, "PENDING"), false);
    assert.equal(isBusinessActionableOrder(undefined, undefined), false);
  });

  it("shows paid Stripe orders", () => {
    assert.equal(isBusinessActionableOrder("STRIPE", "PAID"), true);
  });

  it("shows pay-at-pickup orders immediately (even when PENDING)", () => {
    assert.equal(isBusinessActionableOrder("IN_PERSON", "PENDING"), true);
    assert.equal(isBusinessActionableOrder("IN_PERSON", "PAID"), true);
  });
});
