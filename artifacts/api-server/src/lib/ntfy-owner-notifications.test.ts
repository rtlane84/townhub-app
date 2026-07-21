import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildOwnerNewOrderNtfyMessage,
  buildOwnerNewAppointmentNtfyMessage,
  buildOwnerNtfyTestMessage,
} from "./ntfy-owner-notifications.ts";

describe("ntfy-owner-notifications", () => {
  const previousBase = process.env.APP_BASE_URL;
  const previousSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://townhub.test";
    process.env.SESSION_SECRET = "test-order-access-secret-with-32-chars-min";
  });

  afterEach(() => {
    if (previousBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousBase;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  });

  it("formats new order push content like Discord embed fields", () => {
    const message = buildOwnerNewOrderNtfyMessage({
      orderId: 9,
      orderNumber: "TH-100",
      businessId: 1,
      businessName: "Clay Diner",
      timeZone: "America/New_York",
      customerName: "Alex",
      fulfillmentType: "PICKUP",
      total: 24.5,
      items: [],
      orderedAt: new Date(),
      subtotal: 20,
      tax: 4.5,
      taxLabel: "Tax",
      deliveryFee: null,
      paymentMethod: "STRIPE",
      paymentStatus: "PAID",
    });

    assert.equal(message.title, "New order");
    assert.match(message.message, /\*\*New Order\*\*/);
    assert.match(message.message, /Clay Diner/);
    assert.match(message.message, /Order #9/);
    assert.match(message.message, /Reference: TH-100/);
    assert.match(message.message, /Customer: Alex/);
    assert.match(message.message, /\$24\.50/);
    assert.match(message.message, /^Pickup$/m);
    assert.match(message.message, /Open in TownHub:/);
    assert.match(message.click!, /\/dashboard\/business\/orders\/9/);
  });

  it("formats appointment request push content like Discord embed fields", () => {
    const message = buildOwnerNewAppointmentNtfyMessage({
      businessName: "Clay Salon",
      customerName: "Jamie",
      serviceName: "Haircut",
      requestedDate: "2026-07-10",
      requestedTime: "14:30",
    });

    assert.equal(message.title, "New appointment request");
    assert.match(message.message, /\*\*Clay Salon\*\* received a new appointment request\./);
    assert.match(message.message, /Customer: Jamie/);
    assert.match(message.message, /Service: Haircut/);
    assert.match(message.message, /When: 2026-07-10 at/);
    assert.match(message.message, /Open in TownHub:/);
    assert.match(message.click!, /\/dashboard\/business\/appointments/);
  });

  it("formats test notification copy like Discord test payload", () => {
    const message = buildOwnerNtfyTestMessage("Clay Diner");
    assert.equal(message.title, "TownHub test notification");
    assert.match(message.message, /Phone alerts are configured for \*\*Clay Diner\*\*\./);
    assert.match(message.message, /Status: This is a test message from TownHub\./);
  });
});
