export type NotificationDeliveryForm = {
  notificationEmail: string;
  notificationPhone: string;
  discordWebhookUrl: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  discordEnabled: boolean;
};

/** Maps a channel Enable toggle onto the legacy per-event DB flags. */
export function channelEventFlags(enabled: boolean): {
  notifyNewOrders: boolean;
  notifyAppointmentRequests: boolean;
} {
  return {
    notifyNewOrders: enabled,
    notifyAppointmentRequests: enabled,
  };
}

export function channelAlertsHelperText(acceptsAppointments: boolean): string {
  return acceptsAppointments
    ? "Sends new orders and appointment requests."
    : "Sends new order alerts.";
}

export function deliveryFormFromBusiness(business: Record<string, unknown>): NotificationDeliveryForm {
  const notifyNewOrdersByEmail = business.notifyNewOrdersByEmail !== false;
  const notifyAppointmentRequestsByEmail = business.notifyAppointmentRequestsByEmail !== false;
  const notifyNewOrdersBySms = business.notifyNewOrdersBySms === true;
  const notifyAppointmentRequestsBySms = business.notifyAppointmentRequestsBySms === true;
  const notifyNewOrdersByDiscord = business.notifyNewOrdersByDiscord === true;
  const notifyAppointmentRequestsByDiscord = business.notifyAppointmentRequestsByDiscord === true;

  return {
    notificationEmail: String(business.notificationEmail ?? business.orderNotificationEmail ?? ""),
    notificationPhone: String(business.notificationPhone ?? ""),
    discordWebhookUrl: String(business.discordWebhookUrl ?? ""),
    emailEnabled: notifyNewOrdersByEmail || notifyAppointmentRequestsByEmail,
    smsEnabled: notifyNewOrdersBySms || notifyAppointmentRequestsBySms,
    discordEnabled: notifyNewOrdersByDiscord || notifyAppointmentRequestsByDiscord,
  };
}

function fieldsMatch<K extends keyof NotificationDeliveryForm>(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
  keys: K[],
): boolean {
  return keys.every((key) => form[key] === saved[key]);
}

export function isEmailSettingsDirty(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
): boolean {
  return !fieldsMatch(form, saved, ["notificationEmail", "emailEnabled"]);
}

export function isSmsSettingsDirty(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
): boolean {
  return !fieldsMatch(form, saved, ["notificationPhone", "smsEnabled"]);
}

export function isDiscordSettingsDirty(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
): boolean {
  return !fieldsMatch(form, saved, ["discordWebhookUrl", "discordEnabled"]);
}

export const UNSAVED_SETTINGS_TEST_HINT = "Save settings before sending a test";
