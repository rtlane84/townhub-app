import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";
import { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
import { buildCustomerLifecycleSms, buildOwnerNewOrderSms } from "./notification-sms";
import { statusToCustomerEvent } from "./email-templates/types";
import { resolveNotificationStatus } from "./notification-content";
import { buildOwnerNewAppointmentEmail } from "./notification-content";
import { customerOrderUrl } from "./notification-urls";

const sampleOrder = {
  orderId: 42,
  orderNumber: "ORD-1001",
  businessId: 1,
  businessName: "Clay Diner",
  businessLogoUrl: "https://cdn.example.com/logo.png",
  businessAddress: "123 Main St",
  pickupInstructions: "Use side door",
  customerName: "Alex",
  customerEmail: "alex@example.com",
  customerPhone: "+15555550100",
  fulfillmentType: "PICKUP",
  paymentMethod: "STRIPE",
  paymentStatus: "PAID",
  total: 24.5,
  items: [{ productName: "Latte", quantity: 2, unitPrice: 12.25 }],
  orderedAt: new Date("2026-06-24T14:30:00Z"),
};

describe("notification delivery", () => {
  it("maps delivery results to meaningful log statuses", () => {
    assert.equal(resolveNotificationStatus({ sent: true }), "SENT");
    assert.equal(resolveNotificationStatus({ sent: false, providerUnavailable: true }), "LOGGED");
    assert.equal(resolveNotificationStatus({ sent: false, error: "Provider rejected message" }), "FAILED");
  });
});

describe("customer lifecycle emails", () => {
  it('uses "We received your order" for the first email without "confirmed"', () => {
    const email = buildCustomerLifecycleEmail("ORDER_RECEIVED", sampleOrder);
    assert.equal(email.subject, "We received your order");
    assert.doesNotMatch(email.text, /confirmed/i);
    assert.doesNotMatch(email.html, /confirmed/i);
    assert.match(email.html, /View Order/);
    assert.match(email.text, new RegExp(customerOrderUrl(42).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("uses business-specific accepted subject", () => {
    const email = buildCustomerLifecycleEmail("ORDER_ACCEPTED", sampleOrder);
    assert.equal(email.subject, "Clay Diner accepted your order");
    assert.match(email.text, /accepted your order/);
  });

  it("maps order statuses to lifecycle events", () => {
    assert.equal(statusToCustomerEvent("CONFIRMED"), "ORDER_ACCEPTED");
    assert.equal(statusToCustomerEvent("PREPARING"), "ORDER_PREPARING");
    assert.equal(statusToCustomerEvent("READY_FOR_PICKUP"), "ORDER_READY_FOR_PICKUP");
    assert.equal(statusToCustomerEvent("NEW"), null);
  });
});

describe("owner new order notifications", () => {
  it("builds professional HTML owner email with dashboard link", () => {
    const previous = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://townhub.test";
    try {
      const email = buildOwnerNewOrderEmail(sampleOrder);
      assert.match(email.subject, /New order ORD-1001/);
      assert.match(email.html, /New Order Received/);
      assert.match(email.html, /Alex/);
      assert.match(email.html, /Online card payment/);
      assert.match(email.html, /Open Order/);
      assert.match(email.html, /https:\/\/townhub\.test\/dashboard\/business\/orders\/42/);
      assert.doesNotMatch(email.html, /localhost/);
    } finally {
      if (previous === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previous;
    }
  });

  it("builds compact owner SMS with dashboard link", () => {
    const body = buildOwnerNewOrderSms(sampleOrder);
    assert.match(body, /Clay Diner/);
    assert.match(body, /ORD-1001/);
    assert.match(body, /dashboard\/business\/orders\/42/);
  });
});

describe("customer lifecycle SMS", () => {
  it("keeps SMS concise with order link", () => {
    const sms = buildCustomerLifecycleSms("ORDER_RECEIVED", sampleOrder);
    assert.match(sms, /Clay Diner received your order #ORD-1001/);
    assert.match(sms, /order\/42/);
    assert.ok(sms.length < 320);
  });

  it("uses distinct copy per lifecycle event", () => {
    const received = buildCustomerLifecycleSms("ORDER_RECEIVED", sampleOrder);
    const accepted = buildCustomerLifecycleSms("ORDER_ACCEPTED", sampleOrder);
    assert.notEqual(received, accepted);
  });
});

describe("appointment owner notifications", () => {
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
