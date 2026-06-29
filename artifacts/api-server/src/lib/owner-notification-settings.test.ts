import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  paymentMethodLabel,
  resolveOwnerNotificationEmail,
  resolveOwnerNotificationPhone,
} from "./owner-notification-settings";

describe("owner notification settings", () => {
  it("resolves notification email with legacy fallback", () => {
    assert.equal(
      resolveOwnerNotificationEmail({ notificationEmail: "owner@example.com", orderNotificationEmail: "legacy@example.com" }),
      "owner@example.com",
    );
    assert.equal(
      resolveOwnerNotificationEmail({ notificationEmail: null, orderNotificationEmail: "legacy@example.com" }),
      "legacy@example.com",
    );
    assert.equal(resolveOwnerNotificationEmail({ notificationEmail: "  ", orderNotificationEmail: null }), null);
  });

  it("resolves notification phone", () => {
    assert.equal(resolveOwnerNotificationPhone({ notificationPhone: "+15555550100" }), "+15555550100");
    assert.equal(resolveOwnerNotificationPhone({ notificationPhone: "  " }), null);
  });

  it("labels payment methods for owner alerts", () => {
    assert.equal(paymentMethodLabel("IN_PERSON"), "Pay at pickup");
    assert.equal(paymentMethodLabel("STRIPE"), "Online payment (card)");
  });
});
