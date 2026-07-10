import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLEAR_CART_FOR_OTHER_BUSINESS_MESSAGE,
  mergeCartAdd,
  needsClearCartConfirmation,
} from "./cart-business.ts";

describe("cart-business", () => {
  it("exposes the expected clear-cart confirmation copy", () => {
    assert.equal(
      CLEAR_CART_FOR_OTHER_BUSINESS_MESSAGE,
      "Your cart contains items from another business. Clear cart and start a new order?",
    );
  });

  it("needsClearCartConfirmation when switching businesses", () => {
    assert.equal(needsClearCartConfirmation(1, 2), true);
    assert.equal(needsClearCartConfirmation(1, 1), false);
    assert.equal(needsClearCartConfirmation(null, 2), false);
  });

  it("aborts add when another business is in cart and not confirmed", () => {
    const prev = {
      businessId: 1,
      items: [{ lineKey: "a", quantity: 1 }],
    };
    assert.equal(
      mergeCartAdd(prev, 2, { lineKey: "b", quantity: 1 }, { clearOtherBusinessConfirmed: false }),
      null,
    );
  });

  it("replaces cart when switching businesses and confirmed", () => {
    const prev = {
      businessId: 1,
      items: [{ lineKey: "a", quantity: 2 }],
    };
    assert.deepEqual(
      mergeCartAdd(prev, 2, { lineKey: "b", quantity: 1 }, { clearOtherBusinessConfirmed: true }),
      { businessId: 2, items: [{ lineKey: "b", quantity: 1 }] },
    );
  });

  it("increments quantity for the same line key", () => {
    const prev = {
      businessId: 1,
      items: [{ lineKey: "a", quantity: 1 }],
    };
    assert.deepEqual(
      mergeCartAdd(prev, 1, { lineKey: "a", quantity: 2 }, { clearOtherBusinessConfirmed: false }),
      { businessId: 1, items: [{ lineKey: "a", quantity: 3 }] },
    );
  });

  it("appends a new line for the same business", () => {
    const prev = {
      businessId: 1,
      items: [{ lineKey: "a", quantity: 1 }],
    };
    assert.deepEqual(
      mergeCartAdd(prev, 1, { lineKey: "b", quantity: 1 }, { clearOtherBusinessConfirmed: false }),
      {
        businessId: 1,
        items: [
          { lineKey: "a", quantity: 1 },
          { lineKey: "b", quantity: 1 },
        ],
      },
    );
  });
});
