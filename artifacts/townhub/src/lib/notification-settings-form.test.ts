import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deliveryFormFromBusiness,
  isDiscordSettingsDirty,
  isEmailSettingsDirty,
  isSmsSettingsDirty,
} from "./notification-settings-form.ts";

describe("notification-settings-form", () => {
  const saved = deliveryFormFromBusiness({
    notificationEmail: "owner@example.com",
    notificationPhone: "+15551234567",
    discordWebhookUrl: "https://discord.com/api/webhooks/1/abc",
    notifyNewOrdersByEmail: true,
    notifyNewOrdersBySms: false,
    notifyNewOrdersByDiscord: true,
    notifyAppointmentRequestsByEmail: true,
    notifyAppointmentRequestsBySms: false,
    notifyAppointmentRequestsByDiscord: false,
  });

  it("detects unsaved email changes", () => {
    assert.equal(isEmailSettingsDirty(saved, saved), false);
    assert.equal(
      isEmailSettingsDirty({ ...saved, notificationEmail: "other@example.com" }, saved),
      true,
    );
  });

  it("detects unsaved sms and discord changes", () => {
    assert.equal(isSmsSettingsDirty({ ...saved, notificationPhone: "+19998887777" }, saved), true);
    assert.equal(
      isDiscordSettingsDirty({ ...saved, discordWebhookUrl: "https://discord.com/api/webhooks/2/def" }, saved),
      true,
    );
  });
});
