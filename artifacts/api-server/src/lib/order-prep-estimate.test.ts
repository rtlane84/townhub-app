import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAsapPrepEstimate,
  DELIVERY_PREP_BUFFER_MINUTES,
  FALLBACK_DEFAULT_PREP_MINUTES,
} from "@workspace/api-zod";
import { calculateOrderPrepEstimate } from "./order-prep-estimate.ts";

describe("calculateAsapPrepEstimate", () => {
  const orderedAt = new Date("2026-07-04T12:00:00.000Z");

  it("uses the longest item prep time instead of summing item prep times", () => {
    const estimate = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: [
        { quantity: 2, prepTimeMinutes: 10 },
        { quantity: 1, prepTimeMinutes: 25 },
        { quantity: 3, prepTimeMinutes: 5 },
      ],
      orderedAt,
    });

    assert.equal(estimate.centerMinutes, 30);
    assert.equal(estimate.minMinutes, 25);
    assert.equal(estimate.maxMinutes, 35);
  });

  it("does not balloon for many quick items", () => {
    const few = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1, prepTimeMinutes: 5 }],
      orderedAt,
    });
    const many = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: Array.from({ length: 6 }, () => ({ quantity: 2, prepTimeMinutes: 5 })),
      orderedAt,
    });

    assert.ok(many.centerMinutes - few.centerMinutes <= 10);
    assert.ok(many.centerMinutes < 60);
  });

  it("falls back to business default when items lack prep times", () => {
    const estimate = calculateAsapPrepEstimate({
      defaultPrepMinutes: 20,
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1 }],
      orderedAt,
    });

    assert.equal(estimate.centerMinutes, 20);
    assert.equal(estimate.minMinutes, 15);
    assert.equal(estimate.maxMinutes, 25);
  });

  it("uses global fallback when business default is missing", () => {
    const estimate = calculateAsapPrepEstimate({
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1 }],
      orderedAt,
    });

    assert.equal(estimate.centerMinutes, FALLBACK_DEFAULT_PREP_MINUTES);
  });

  it("adds delivery buffer for delivery orders", () => {
    const pickup = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1, prepTimeMinutes: 10 }],
      orderedAt,
    });
    const delivery = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "DELIVERY",
      items: [{ quantity: 1, prepTimeMinutes: 10 }],
      orderedAt,
    });

    assert.equal(
      delivery.centerMinutes - pickup.centerMinutes,
      DELIVERY_PREP_BUFFER_MINUTES,
    );
  });

  it("uses a custom delivery buffer when provided", () => {
    const pickup = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1, prepTimeMinutes: 15 }],
      orderedAt,
    });
    const delivery = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      deliveryBufferMinutes: 25,
      fulfillmentType: "DELIVERY",
      items: [{ quantity: 1, prepTimeMinutes: 15 }],
      orderedAt,
    });

    assert.equal(delivery.centerMinutes - pickup.centerMinutes, 25);
  });

  it("stores clock windows relative to order time", () => {
    const estimate = calculateAsapPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      items: [{ quantity: 1, prepTimeMinutes: 15 }],
      orderedAt,
    });

    assert.equal(estimate.estimatedWindowStart.toISOString(), "2026-07-04T12:10:00.000Z");
    assert.equal(estimate.estimatedWindowEnd.toISOString(), "2026-07-04T12:20:00.000Z");
  });
});

describe("order-prep-estimate server helper", () => {
  it("maps product prep times into estimate items", () => {
    const productMap = new Map([
      [
        1,
        {
          id: 1,
          businessId: 1,
          categoryId: null,
          name: "Burger",
          description: null,
          price: "10",
          imageUrl: null,
          available: true,
          featured: false,
          prepTimeMinutes: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        2,
        {
          id: 2,
          businessId: 1,
          categoryId: null,
          name: "Fries",
          description: null,
          price: "4",
          imageUrl: null,
          available: true,
          featured: false,
          prepTimeMinutes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const estimate = calculateOrderPrepEstimate({
      defaultPrepMinutes: 15,
      fulfillmentType: "PICKUP",
      lineItems: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2 },
      ],
      productMap,
      orderedAt: new Date("2026-07-04T12:00:00.000Z"),
    });

    assert.equal(estimate.centerMinutes, 25);
    assert.equal(estimate.minMinutes, 20);
    assert.equal(estimate.maxMinutes, 30);
  });
});
