import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  channelAlertsHelperText,
  channelEventFlags,
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

  it("initializes channel enable from either event flag", () => {
    assert.equal(saved.emailEnabled, true);
    assert.equal(saved.smsEnabled, false);
    assert.equal(saved.discordEnabled, true);

    const emailMixed = deliveryFormFromBusiness({
      notifyNewOrdersByEmail: true,
      notifyAppointmentRequestsByEmail: false,
    });
    assert.equal(emailMixed.emailEnabled, true);

    const emailOff = deliveryFormFromBusiness({
      notifyNewOrdersByEmail: false,
      notifyAppointmentRequestsByEmail: false,
    });
    assert.equal(emailOff.emailEnabled, false);

    const smsOn = deliveryFormFromBusiness({
      notifyNewOrdersBySms: false,
      notifyAppointmentRequestsBySms: true,
    });
    assert.equal(smsOn.smsEnabled, true);
  });

  it("maps enable to both event flags", () => {
    assert.deepEqual(channelEventFlags(true), {
      notifyNewOrders: true,
      notifyAppointmentRequests: true,
    });
    assert.deepEqual(channelEventFlags(false), {
      notifyNewOrders: false,
      notifyAppointmentRequests: false,
    });
  });

  it("uses appointment-aware helper text", () => {
    assert.equal(
      channelAlertsHelperText(true),
      "Sends new orders and appointment requests.",
    );
    assert.equal(channelAlertsHelperText(false), "Sends new order alerts.");
  });

  it("detects unsaved email changes", () => {
    assert.equal(isEmailSettingsDirty(saved, saved), false);
    assert.equal(
      isEmailSettingsDirty({ ...saved, notificationEmail: "other@example.com" }, saved),
      true,
    );
    assert.equal(isEmailSettingsDirty({ ...saved, emailEnabled: false }, saved), true);
  });

  it("detects unsaved sms and discord changes", () => {
    assert.equal(isSmsSettingsDirty({ ...saved, notificationPhone: "+19998887777" }, saved), true);
    assert.equal(isSmsSettingsDirty({ ...saved, smsEnabled: true }, saved), true);
    assert.equal(
      isDiscordSettingsDirty({ ...saved, discordWebhookUrl: "https://discord.com/api/webhooks/2/def" }, saved),
      true,
    );
    assert.equal(isDiscordSettingsDirty({ ...saved, discordEnabled: false }, saved), true);
  });
});
