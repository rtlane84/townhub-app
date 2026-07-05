import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSerializedOrder, groupRowsByKey } from "./order-serialization-core";

const baseOrder = {
  id: 42,
  businessId: 1,
  orderNumber: "ORD-42",
  status: "NEW",
  fulfillmentType: "PICKUP",
  customerName: "Alex",
  customerEmail: "alex@example.com",
  customerPhone: null,
  customerUserId: null,
  deliveryAddress: null,
  pickupTime: null,
  estimatedWindowStart: new Date("2026-06-24T14:55:00Z"),
  estimatedWindowEnd: new Date("2026-06-24T15:05:00Z"),
  notes: null,
  specialFields: null,
  subtotalCents: 2300,
  taxCents: 150,
  taxLabel: "Sales Tax",
  taxRatePercent: "6.50",
  total: "24.50",
  deliveryFee: null,
  paymentStatus: "PAID",
  paymentMethod: "STRIPE",
  stripeSessionId: null,
  refundStatus: "NONE",
  refundedAmountCents: 0,
  lastRefundedAt: null,
  createdAt: new Date("2026-06-24T14:30:00Z"),
} as const;

describe("buildSerializedOrder", () => {
  it("includes items, options, tax, and prep-time estimate fields", () => {
    const serialized = buildSerializedOrder(
      baseOrder as never,
      [
        {
          id: 7,
          orderId: 42,
          productId: 3,
          productName: "Latte",
          quantity: 2,
          unitPrice: "12.25",
          subtotal: "24.50",
        },
      ] as never,
      "Clay Diner",
      new Map([
        [
          7,
          [
            {
              id: 11,
              orderItemId: 7,
              optionId: 5,
              groupName: "Milk",
              optionName: "Oat",
              priceAdjustment: "0.75",
            },
          ],
        ],
      ]) as never,
      { includeRefundDetails: false },
    );

    assert.equal(serialized.businessName, "Clay Diner");
    assert.equal(serialized.tax, 1.5);
    assert.equal(serialized.taxLabel, "Sales Tax");
    assert.equal(serialized.estimatedWindowStart, "2026-06-24T14:55:00.000Z");
    assert.equal(serialized.estimatedWindowEnd, "2026-06-24T15:05:00.000Z");
    assert.equal(serialized.items?.length, 1);
    assert.equal(serialized.items?.[0]?.options?.[0]?.optionName, "Oat");
    assert.equal(serialized.refundableAmount, 24.5);
  });

  it("includes refund details when requested", () => {
    const serialized = buildSerializedOrder(
      {
        ...baseOrder,
        refundStatus: "PARTIAL",
        refundedAmountCents: 500,
        lastRefundedAt: new Date("2026-06-24T16:00:00Z"),
      } as never,
      [],
      "Clay Diner",
      new Map(),
      { includeRefundDetails: true },
      [
        {
          id: 1,
          amountCents: 500,
          reason: "Customer request",
          status: "SUCCEEDED",
          stripeRefundId: "re_123",
          createdByUserId: "owner-1",
          createdByName: "Owner",
          createdAt: "2026-06-24T16:00:00.000Z",
        },
      ],
    );

    assert.equal(serialized.refundStatus, "PARTIAL");
    assert.equal(serialized.refundedAmount, 5);
    assert.equal(serialized.refunds?.length, 1);
    assert.equal(serialized.lastRefundedAt, "2026-06-24T16:00:00.000Z");
  });
});

describe("groupRowsByKey", () => {
  it("groups rows by order id for batched hydration", () => {
    const grouped = groupRowsByKey(
      [
        { orderId: 1, id: 10 },
        { orderId: 2, id: 11 },
        { orderId: 1, id: 12 },
      ],
      (row) => row.orderId,
    );

    assert.equal(grouped.get(1)?.length, 2);
    assert.equal(grouped.get(2)?.length, 1);
  });
});
