import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatKitchenFulfillment,
  formatKitchenPaymentStatus,
  formatKitchenTicketTime,
  parseKitchenSpecialFields,
} from "./kitchen-ticket-format.ts";

describe("kitchen-ticket-format", () => {
  it("formatKitchenTicketTime returns a readable local datetime", () => {
    const formatted = formatKitchenTicketTime("2026-06-24T18:30:00.000Z");
    assert.match(formatted, /Jun/);
    assert.match(formatted, /2026/);
  });

  it("formatKitchenPaymentStatus maps pay-at-pickup and paid card orders", () => {
    assert.equal(formatKitchenPaymentStatus({ paymentMethod: "IN_PERSON", paymentStatus: "PENDING" }), "Pay at pickup");
    assert.equal(formatKitchenPaymentStatus({ paymentMethod: "STRIPE", paymentStatus: "PAID" }), "Paid");
  });

  it("formatKitchenFulfillment includes delivery address when present", () => {
    assert.equal(
      formatKitchenFulfillment({
        fulfillmentType: "DELIVERY",
        deliveryAddress: "123 Main St",
        pickupTime: null,
      }),
      "Delivery — 123 Main St",
    );
  });

  it("parseKitchenSpecialFields expands JSON objects and falls back to raw text", () => {
    assert.deepEqual(parseKitchenSpecialFields('{"allergy":"No nuts"}'), ["allergy: No nuts"]);
    assert.deepEqual(parseKitchenSpecialFields("Extra spicy"), ["Extra spicy"]);
  });
});
