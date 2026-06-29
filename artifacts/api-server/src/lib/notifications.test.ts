import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOwnerNewAppointmentEmail,
  buildOwnerNewOrderEmail,
  buildOwnerNewOrderSms,
  resolveNotificationStatus,
} from "./notification-content";

describe("owner notification delivery", () => {
  it("maps delivery results to meaningful log statuses", () => {
    assert.equal(resolveNotificationStatus({ sent: true }), "SENT");
    assert.equal(resolveNotificationStatus({ sent: false, providerUnavailable: true }), "LOGGED");
    assert.equal(resolveNotificationStatus({ sent: false, error: "Provider rejected message" }), "FAILED");
  });

  it("builds new order owner email content", () => {
    const { subject, body } = buildOwnerNewOrderEmail({
      businessName: "Main St Cafe",
      orderNumber: "ORD-1001",
      customerName: "Alex",
      customerEmail: "alex@example.com",
      total: 24.5,
      paymentMethod: "STRIPE",
      fulfillmentType: "PICKUP",
      items: [{ productName: "Latte", quantity: 2 }],
      orderId: 42,
    });

    assert.match(subject, /ORD-1001/);
    assert.match(body, /Main St Cafe/);
    assert.match(body, /Latte x2/);
    assert.match(body, /dashboard\/business\/orders\/42/);
  });

  it("builds compact new order SMS content", () => {
    const body = buildOwnerNewOrderSms({
      businessName: "Main St Cafe",
      orderNumber: "ORD-1001",
      customerName: "Alex",
      total: 24.5,
      paymentMethod: "IN_PERSON",
      orderId: 42,
    });

    assert.match(body, /Main St Cafe/);
    assert.match(body, /ORD-1001/);
    assert.match(body, /Pay at pickup/);
  });

  it("builds appointment request owner email content", () => {
    const { subject, body } = buildOwnerNewAppointmentEmail({
      businessName: "Town Salon",
      customerName: "Jamie",
      customerEmail: "jamie@example.com",
      customerPhone: "+15555550100",
      serviceName: "Haircut",
      requestedDate: "2026-06-24",
      requestedTime: "14:30",
      notes: "First visit",
    });

    assert.match(subject, /appointment request/i);
    assert.match(body, /Jamie/);
    assert.match(body, /Haircut/);
    assert.match(body, /appointments/);
  });
});
