import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateGuestOrderContact } from "./guest-checkout";

describe("validateGuestOrderContact", () => {
  const base = {
    customerName: "Alex Guest",
    customerEmail: "alex@example.com",
    customerPhone: "555-123-4567",
    fulfillmentType: "PICKUP" as const,
  };

  it("accepts valid guest contact info", () => {
    assert.equal(validateGuestOrderContact(base).ok, true);
  });

  it("requires name, email, and phone", () => {
    assert.equal(validateGuestOrderContact({ ...base, customerName: " " }).ok, false);
    assert.equal(validateGuestOrderContact({ ...base, customerEmail: "" }).ok, false);
    assert.equal(validateGuestOrderContact({ ...base, customerPhone: "" }).ok, false);
  });

  it("requires delivery address for delivery orders", () => {
    const result = validateGuestOrderContact({
      ...base,
      fulfillmentType: "DELIVERY",
      deliveryAddress: "",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /Delivery address/);
  });
});
