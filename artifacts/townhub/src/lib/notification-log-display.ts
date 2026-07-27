/** Shared display helpers for Admin Notification History. */

export function notificationDeliveryProvider(channel: string | undefined): string {
  if (channel === "SMS") return "Twilio";
  if (channel === "EMAIL") return "Resend / SMTP";
  if (channel === "PUSH") return "TownHub App Push";
  if (channel === "NTFY") return "ntfy";
  if (channel === "DISCORD") return "Discord";
  return "Unknown";
}

export function formatNotificationRecipient(input: {
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientUserId?: string | null;
}): string {
  if (input.recipientEmail?.trim()) return input.recipientEmail.trim();
  if (input.recipientPhone?.trim()) return input.recipientPhone.trim();
  if (input.recipientUserId?.trim()) return `user:${input.recipientUserId.trim()}`;
  return "Unknown recipient";
}
