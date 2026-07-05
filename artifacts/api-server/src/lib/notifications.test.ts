import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCustomerLifecycleEmail } from "./email-templates/customer-emails";
import { buildOwnerNewOrderEmail } from "./email-templates/business-emails";
import { buildCustomerLifecycleSms, buildOwnerNewOrderSms } from "./notification-sms";
import { statusToCustomerEvent } from "./email-templates/types";
import { resolveNotificationStatus } from "./notification-content";
import { buildOwnerNewAppointmentEmail } from "./notification-content";
import { customerOrderUrlForNotification } from "./notification-urls";

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
  subtotal: 23,
  tax: 1.5,
  taxLabel: "Sales Tax",
  deliveryFee: null,
  total: 24.5,
  items: [{ productName: "Latte", quantity: 2, unitPrice: 12.25 }],
  orderedAt: new Date("2026-06-24T14:30:00Z"),
  estimatedWindowStart: new Date("2026-06-24T14:55:00Z"),
  estimatedWindowEnd: new Date("2026-06-24T15:05:00Z"),
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
    const previous = process.env.APP_BASE_URL;
    const previousSecret = process.env.SESSION_SECRET;
    process.env.APP_BASE_URL = "https://townhub.test";
    process.env.SESSION_SECRET = "test-order-access-secret-with-32-chars-min";
    try {
      const guestOrder = { ...sampleOrder, customerUserId: null };
      const email = buildCustomerLifecycleEmail("ORDER_RECEIVED", guestOrder);
      assert.equal(email.subject, "We received your order");
      assert.doesNotMatch(email.text, /confirmed/i);
      assert.doesNotMatch(email.html, /confirmed/i);
      assert.match(email.html, /View Order/);
      const expectedUrl = customerOrderUrlForNotification(guestOrder);
      assert.match(email.text, new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(email.html, /token=/);
    } finally {
      if (previous === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previous;
      if (previousSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previousSecret;
    }
  });

  it("omits access token for signed-in customer order links", () => {
    const previous = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://townhub.test";
    try {
      const signedInOrder = { ...sampleOrder, customerUserId: "user_abc" };
      const email = buildCustomerLifecycleEmail("ORDER_RECEIVED", signedInOrder);
      const expectedUrl = customerOrderUrlForNotification(signedInOrder);
      assert.equal(expectedUrl, "https://townhub.test/order/42");
      assert.doesNotMatch(email.text, /token=/);
      assert.match(email.text, new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
      if (previous === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = previous;
    }
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

describe("customer refund email", () => {
  it("includes refund amount and bank timing note", async () => {
    const { buildCustomerOrderRefundEmail } = await import("./email-templates/customer-emails");
    const email = buildCustomerOrderRefundEmail(sampleOrder, 850);
    assert.match(email.subject, /Refund issued/);
    assert.match(email.text, /\$8\.50/);
    assert.match(email.text, /5–10 business days/);
    assert.doesNotMatch(email.text, /internal/i);
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
    assert.match(body, /Sales Tax/);
    assert.match(body, /Estimated pickup:/i);
    assert.match(body, /dashboard\/business\/orders\/42/);
  });
});

describe("order tax in notifications", () => {
  it("shows subtotal and tax in customer order received email", () => {
    const email = buildCustomerLifecycleEmail("ORDER_RECEIVED", sampleOrder);
    assert.match(email.text, /Subtotal: \$23\.00/);
    assert.match(email.text, /Sales Tax: \$1\.50/);
    assert.match(email.text, /Total: \$24\.50/);
  });

  it("shows subtotal and tax in owner new order email", () => {
    const email = buildOwnerNewOrderEmail(sampleOrder);
    assert.match(email.html, /Subtotal/);
    assert.match(email.html, /Sales Tax/);
  });
});

describe("customer lifecycle SMS", () => {
  it("includes estimated window in order received SMS", () => {
    const sms = buildCustomerLifecycleSms("ORDER_RECEIVED", sampleOrder);
    assert.match(sms, /Estimated pickup:/i);
  });

  it("keeps SMS concise with guest order link and token", () => {
    const previousSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "test-order-access-secret-with-32-chars-min";
    try {
      const guestOrder = { ...sampleOrder, customerUserId: null };
      const sms = buildCustomerLifecycleSms("ORDER_RECEIVED", guestOrder);
      assert.match(sms, /Clay Diner received your order #ORD-1001/);
      assert.match(sms, /order\/42\?token=/);
      assert.ok(sms.length < 400);
    } finally {
      if (previousSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previousSecret;
    }
  });

  it("uses distinct copy per lifecycle event", () => {
    const received = buildCustomerLifecycleSms("ORDER_RECEIVED", sampleOrder);
    const accepted = buildCustomerLifecycleSms("ORDER_ACCEPTED", sampleOrder);
    assert.notEqual(received, accepted);
  });
});

describe("appointment owner notifications", () => {
  it("builds styled appointment request owner email content", () => {
    const email = buildOwnerNewAppointmentEmail({
      businessName: "Town Salon",
      customerName: "Jamie",
      customerEmail: "jamie@example.com",
      customerPhone: "+15555550100",
      serviceName: "Haircut",
      requestedDate: "2026-06-24",
      requestedTime: "14:30",
      notes: "First visit",
    });

    assert.match(email.subject, /appointment request/i);
    assert.match(email.text, /Jamie/);
    assert.match(email.text, /Haircut/);
    assert.match(email.text, /appointments/);
    assert.match(email.html, /New Appointment Request/);
    assert.match(email.html, /Review Request/);
    assert.match(email.html, /TownHub/);
  });
});
