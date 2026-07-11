import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_NOTIFICATION_CATEGORY_KEYS,
  categoryForEventType,
  getNotificationCategory,
  listNotificationCategories,
} from "./notification-categories.ts";
import {
  buildNotificationDeepLinkPath,
  buildPushDataPayload,
} from "./notification-deep-links.ts";
import {
  buildCustomerOrderPush,
  buildOwnerNewOrderPush,
  buildAdminApplicationPush,
} from "./notification-push-copy.ts";

describe("notification-categories", () => {
  it("maps lifecycle events to preference categories", () => {
    assert.equal(categoryForEventType("NEW_ORDER"), "OWNER_NEW_ORDER");
    assert.equal(categoryForEventType("ORDER_ACCEPTED"), "CUSTOMER_ORDER_ACCEPTED");
    assert.equal(categoryForEventType("ORDER_READY_FOR_PICKUP"), "CUSTOMER_ORDER_READY");
    assert.equal(categoryForEventType("ADMIN_APPLICATION_SUBMITTED"), "ADMIN_NEW_APPLICATION");
    assert.equal(categoryForEventType("UNKNOWN_EVENT"), null);
  });

  it("lists implemented owner categories", () => {
    const cats = listNotificationCategories({
      audience: "BUSINESS_OWNER",
      implementedOnly: true,
    });
    assert.ok(cats.some((c) => c.key === "OWNER_NEW_ORDER"));
    assert.ok(cats.some((c) => c.key === "OWNER_APPOINTMENT_REQUEST"));
    assert.ok(!cats.some((c) => c.key === "OWNER_LOW_INVENTORY"));
    // Mandatory Stripe alerts are hidden from preference toggles.
    assert.ok(!cats.some((c) => c.key === "OWNER_STRIPE_ISSUE"));
    // Subscription push not implemented yet — hidden from App Push UI.
    assert.ok(!cats.some((c) => c.key === "OWNER_SUBSCRIPTION"));
  });

  it("maps stripe critical events to OWNER_STRIPE_ISSUE", () => {
    assert.equal(categoryForEventType("REFUND_FAILED"), "OWNER_STRIPE_ISSUE");
    assert.equal(categoryForEventType("STRIPE_CONNECT_ISSUE"), "OWNER_STRIPE_ISSUE");
    assert.equal(getNotificationCategory("OWNER_STRIPE_ISSUE")?.userToggleable, false);
  });

  it("has definitions for every registry key", () => {
    for (const key of ALL_NOTIFICATION_CATEGORY_KEYS) {
      assert.ok(getNotificationCategory(key));
    }
  });
});

describe("notification-deep-links", () => {
  it("builds owner and customer order paths", () => {
    assert.equal(
      buildNotificationDeepLinkPath({ type: "ORDER", orderId: 42, audience: "OWNER" }),
      "/dashboard/business/orders/42",
    );
    assert.equal(
      buildNotificationDeepLinkPath({ type: "ORDER", orderId: 42, audience: "CUSTOMER" }),
      "/order/42",
    );
    assert.equal(
      buildNotificationDeepLinkPath({ type: "ADMIN_APPLICATIONS" }),
      "/dashboard/admin/applications",
    );
  });

  it("builds string-only push data payloads", () => {
    const data = buildPushDataPayload({
      deepLink: "/order/1",
      category: "CUSTOMER_ORDER_ACCEPTED",
      eventType: "ORDER_ACCEPTED",
      orderId: 1,
      businessId: 9,
    });
    assert.equal(data.deepLink, "/order/1");
    assert.equal(data.orderId, "1");
    assert.equal(data.businessId, "9");
  });
});

describe("notification-push-copy", () => {
  const order = {
    orderId: 7,
    orderNumber: "TH-1",
    businessOrderNumber: 3,
    businessId: 1,
    businessName: "Clay Diner",
    customerName: "Alex",
    customerUserId: "user_1",
    customerEmail: "a@example.com",
    customerPhone: null,
    fulfillmentType: "PICKUP" as const,
    paymentMethod: "STRIPE" as const,
    paymentStatus: "PAID" as const,
    subtotal: 10,
    tax: 0,
    taxLabel: null,
    deliveryFee: null,
    total: 10,
    items: [],
    orderedAt: new Date("2026-01-01T12:00:00Z"),
    notes: null,
    estimatedWindowStart: null,
    estimatedWindowEnd: null,
  };

  it("builds customer and owner push copy with deep links", () => {
    const customer = buildCustomerOrderPush("ORDER_ACCEPTED", order);
    assert.match(customer.title, /accepted/i);
    assert.equal(customer.deepLink, "/order/7");

    const owner = buildOwnerNewOrderPush(order);
    assert.equal(owner.deepLink, "/dashboard/business/orders/7");
    assert.match(owner.body, /Alex/);

    const admin = buildAdminApplicationPush({
      businessName: "New Cafe",
      applicationId: 2,
    });
    assert.equal(admin.deepLink, "/dashboard/admin/applications");
  });
});
