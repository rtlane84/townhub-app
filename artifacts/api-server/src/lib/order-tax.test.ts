import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStripeCheckoutLineItems,
  calculateOrderTaxCents,
  calculateOrderTotals,
  centsToDollars,
  dollarsToCents,
  resolveOrderTotalsDisplay,
  resolveDisplayedOrderTotals,
} from "@workspace/api-zod";

describe("order tax calculation", () => {
  it("rounds tax to cents correctly", () => {
    assert.equal(calculateOrderTaxCents(1099, 6), 66);
    assert.equal(calculateOrderTaxCents(1000, 6.875), 69);
  });

  it("leaves tax at zero when disabled", () => {
    const totals = calculateOrderTotals({
      items: [{ lineSubtotalCents: 1000, taxable: true }],
      taxEnabled: false,
      taxRatePercent: 6,
      deliveryFeeCents: 0,
    });
    assert.equal(totals.taxCents, 0);
    assert.equal(totals.totalCents, 1000);
  });

  it("applies tax to taxable items when enabled", () => {
    const totals = calculateOrderTotals({
      items: [{ lineSubtotalCents: 1000, taxable: true }],
      taxEnabled: true,
      taxRatePercent: 6,
      deliveryFeeCents: 0,
    });
    assert.equal(totals.subtotalCents, 1000);
    assert.equal(totals.taxCents, 60);
    assert.equal(totals.totalCents, 1060);
  });

  it("excludes non-taxable items from taxable subtotal", () => {
    const totals = calculateOrderTotals({
      items: [
        { lineSubtotalCents: 1000, taxable: true },
        { lineSubtotalCents: 500, taxable: false },
      ],
      taxEnabled: true,
      taxRatePercent: 10,
      deliveryFeeCents: 0,
    });
    assert.equal(totals.subtotalCents, 1500);
    assert.equal(totals.taxCents, 100);
    assert.equal(totals.totalCents, 1600);
  });

  it("includes delivery fee in total but not in tax base", () => {
    const totals = calculateOrderTotals({
      items: [{ lineSubtotalCents: 1000, taxable: true }],
      taxEnabled: true,
      taxRatePercent: 6,
      deliveryFeeCents: 300,
    });
    assert.equal(totals.taxCents, 60);
    assert.equal(totals.totalCents, 1360);
    assert.equal(centsToDollars(totals.totalCents), 13.6);
  });

  it("includes item options in taxable subtotal when parent item is taxable", () => {
    const totals = calculateOrderTotals({
      items: [{ lineSubtotalCents: dollarsToCents(12.5), taxable: true }],
      taxEnabled: true,
      taxRatePercent: 8,
      deliveryFeeCents: 0,
    });
    assert.equal(totals.taxCents, 100);
    assert.equal(totals.totalCents, 1350);
  });

  it("Stripe checkout line items sum to order total including tax and delivery", () => {
    const lines = buildStripeCheckoutLineItems({
      items: [{ productName: "Burger", unitPrice: 10, quantity: 2 }],
      deliveryFee: 3,
      tax: 1.2,
      taxLabel: "Sales Tax",
    });
    const totalCents = lines.reduce(
      (sum, line) => sum + line.unitAmountCents * line.quantity,
      0,
    );
    assert.equal(totalCents, dollarsToCents(24.2));
    assert.equal(centsToDollars(totalCents), 24.2);
  });

  it("pay-at-pickup total includes tax when enabled", () => {
    const totals = calculateOrderTotals({
      items: [{ lineSubtotalCents: 2000, taxable: true }],
      taxEnabled: true,
      taxRatePercent: 7.25,
      deliveryFeeCents: 0,
    });
    assert.equal(totals.totalCents, 2000 + calculateOrderTaxCents(2000, 7.25));
  });

  it("falls back safely for legacy orders without tax fields", () => {
    const display = resolveOrderTotalsDisplay({
      total: 23,
      deliveryFee: 3,
      items: [{ subtotal: 10 }, { subtotal: 10 }],
    });
    assert.equal(display.subtotal, 20);
    assert.equal(display.tax, 0);
    assert.equal(display.total, 23);
  });

  it("shows tax in customer and owner order views via displayed totals", () => {
    const display = resolveDisplayedOrderTotals({
      subtotal: 20,
      tax: 1.2,
      taxLabel: "Sales Tax",
      deliveryFee: null,
      total: 21.2,
      items: [{ subtotal: 20 }],
    });
    assert.equal(display.subtotal, 20);
    assert.equal(display.tax, 1.2);
    assert.equal(display.taxLabel, "Sales Tax");
    assert.equal(display.total, 21.2);
  });
});
