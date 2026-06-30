import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOrderItemSelections } from "./product-option-validation";
import type { SerializedProductOptionGroup } from "./product-option-validation";

const baseProduct = { id: 1, name: "Burger", price: "10.00" };

const sizeGroup: SerializedProductOptionGroup = {
  id: 1,
  name: "Size",
  required: true,
  minSelections: 1,
  maxSelections: 1,
  sortOrder: 0,
  options: [
    { id: 10, name: "Regular", priceAdjustment: 0, available: true, sortOrder: 0 },
    { id: 11, name: "Large", priceAdjustment: 2, available: true, sortOrder: 1 },
  ],
};

const addonGroup: SerializedProductOptionGroup = {
  id: 2,
  name: "Add-ons",
  required: false,
  minSelections: 0,
  maxSelections: 2,
  sortOrder: 1,
  options: [
    { id: 20, name: "Cheese", priceAdjustment: 1.5, available: true, sortOrder: 0 },
    { id: 21, name: "Bacon", priceAdjustment: 2.5, available: true, sortOrder: 1 },
  ],
};

describe("validateOrderItemSelections", () => {
  it("prices base product with no options", () => {
    const result = validateOrderItemSelections(baseProduct, [], 2, []);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.unitPrice, 10);
    assert.equal(result.subtotal, 20);
    assert.equal(result.productName, "Burger");
  });

  it("requires a selection for required groups", () => {
    const result = validateOrderItemSelections(baseProduct, [sizeGroup], 1, []);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Size/);
  });

  it("adds option price adjustments and labels", () => {
    const result = validateOrderItemSelections(
      baseProduct,
      [sizeGroup, addonGroup],
      1,
      [11, 20],
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.unitPrice, 13.5);
    assert.equal(result.productName, "Burger (Large, Cheese)");
    assert.equal(result.options.length, 2);
  });

  it("rejects unknown option ids", () => {
    const result = validateOrderItemSelections(baseProduct, [sizeGroup], 1, [999]);
    assert.equal(result.ok, false);
  });

  it("rejects too many selections in a group", () => {
    const result = validateOrderItemSelections(
      baseProduct,
      [sizeGroup, addonGroup],
      1,
      [10, 11],
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Size/);
  });
});
