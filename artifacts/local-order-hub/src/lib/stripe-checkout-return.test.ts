import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOrderPaymentLabel,
  parseStripeCheckoutReturn,
  shouldClearCartForStripeSuccess,
  stripePaymentPendingMessage,
} from "./stripe-checkout-return.ts";

describe("stripe-checkout-return", () => {
  it("parseStripeCheckoutReturn reads success and canceled params", () => {
    assert.equal(parseStripeCheckoutReturn("?payment=success"), "success");
    assert.equal(parseStripeCheckoutReturn("?payment=canceled"), "canceled");
    assert.equal(parseStripeCheckoutReturn("?payment=success&mock=1"), "success");
    assert.equal(parseStripeCheckoutReturn(""), null);
  });

  it("shouldClearCartForStripeSuccess only clears on success for matching business", () => {
    assert.equal(shouldClearCartForStripeSuccess("success", 1, 1, false), true);
    assert.equal(shouldClearCartForStripeSuccess("success", 1, 2, false), false);
    assert.equal(shouldClearCartForStripeSuccess("canceled", 1, 1, false), false);
    assert.equal(shouldClearCartForStripeSuccess("success", 1, 1, true), false);
  });

  it("stripePaymentPendingMessage shows confirmation copy before webhook marks paid", () => {
    assert.equal(
      stripePaymentPendingMessage("success", "STRIPE", "PENDING"),
      "Payment received. Your order is being confirmed.",
    );
    assert.equal(stripePaymentPendingMessage("success", "STRIPE", "PAID"), null);
    assert.equal(stripePaymentPendingMessage("canceled", "STRIPE", "PENDING"), null);
    assert.equal(stripePaymentPendingMessage("success", "IN_PERSON", "PENDING"), null);
  });

  it("formatOrderPaymentLabel never claims paid before webhook", () => {
    assert.equal(formatOrderPaymentLabel("STRIPE", "PENDING"), "Card payment pending confirmation");
    assert.equal(formatOrderPaymentLabel("STRIPE", "PAID"), "Paid with Card");
    assert.equal(formatOrderPaymentLabel("IN_PERSON", "PENDING"), "Pay at pickup/delivery");
  });
});
