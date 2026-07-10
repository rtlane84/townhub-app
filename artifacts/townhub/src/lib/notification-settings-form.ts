export type NotificationDeliveryForm = {
  notificationEmail: string;
  notificationPhone: string;
  discordWebhookUrl: string;
  discordEnabled: boolean;
  notifyNewOrdersByEmail: boolean;
  notifyNewOrdersBySms: boolean;
  notifyNewOrdersByDiscord: boolean;
  notifyAppointmentRequestsByEmail: boolean;
  notifyAppointmentRequestsBySms: boolean;
  notifyAppointmentRequestsByDiscord: boolean;
};

export function deliveryFormFromBusiness(business: Record<string, unknown>): NotificationDeliveryForm {
  const notifyNewOrdersByDiscord = business.notifyNewOrdersByDiscord === true;
  const notifyAppointmentRequestsByDiscord = business.notifyAppointmentRequestsByDiscord === true;
  return {
    notificationEmail: String(business.notificationEmail ?? business.orderNotificationEmail ?? ""),
    notificationPhone: String(business.notificationPhone ?? ""),
    discordWebhookUrl: String(business.discordWebhookUrl ?? ""),
    discordEnabled: notifyNewOrdersByDiscord || notifyAppointmentRequestsByDiscord,
    notifyNewOrdersByEmail: business.notifyNewOrdersByEmail !== false,
    notifyNewOrdersBySms: business.notifyNewOrdersBySms === true,
    notifyNewOrdersByDiscord,
    notifyAppointmentRequestsByEmail: business.notifyAppointmentRequestsByEmail !== false,
    notifyAppointmentRequestsBySms: business.notifyAppointmentRequestsBySms === true,
    notifyAppointmentRequestsByDiscord,
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
  return !fieldsMatch(form, saved, [
    "notificationEmail",
    "notifyNewOrdersByEmail",
    "notifyAppointmentRequestsByEmail",
  ]);
}

export function isSmsSettingsDirty(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
): boolean {
  return !fieldsMatch(form, saved, [
    "notificationPhone",
    "notifyNewOrdersBySms",
    "notifyAppointmentRequestsBySms",
  ]);
}

export function isDiscordSettingsDirty(
  form: NotificationDeliveryForm,
  saved: NotificationDeliveryForm,
): boolean {
  return !fieldsMatch(form, saved, [
    "discordWebhookUrl",
    "discordEnabled",
    "notifyNewOrdersByDiscord",
    "notifyAppointmentRequestsByDiscord",
  ]);
}

export const UNSAVED_SETTINGS_TEST_HINT = "Save settings before sending a test";
