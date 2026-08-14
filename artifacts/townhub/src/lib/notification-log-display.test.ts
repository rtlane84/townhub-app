import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNotificationRecipient,
  notificationDeliveryProvider,
} from "./notification-log-display.ts";

describe("notification-log-display", () => {
  it("prefers email, then phone, then user id", () => {
    assert.equal(
      formatNotificationRecipient({
        recipientEmail: "a@example.com",
        recipientPhone: "+15555550100",
        recipientUserId: "user_1",
      }),
      "a@example.com",
    );
    assert.equal(
      formatNotificationRecipient({
        recipientEmail: null,
        recipientPhone: "+15555550100",
        recipientUserId: "user_1",
      }),
      "+15555550100",
    );
    assert.equal(
      formatNotificationRecipient({
        recipientEmail: "  ",
        recipientPhone: null,
        recipientUserId: "user_abc",
      }),
      "user:user_abc",
    );
    assert.equal(
      formatNotificationRecipient({
        recipientEmail: null,
        recipientPhone: null,
        recipientUserId: null,
      }),
      "Unknown recipient",
    );
  });

  it("labels push delivery provider", () => {
    assert.equal(notificationDeliveryProvider("PUSH"), "TownHaven App Push");
    assert.equal(notificationDeliveryProvider("EMAIL"), "Resend / SMTP");
    assert.equal(notificationDeliveryProvider("SMS"), "Twilio");
  });
});
