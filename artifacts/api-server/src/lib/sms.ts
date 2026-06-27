import { logger } from "./logger";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export async function sendSms(
  to: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    logger.info("SMS not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER");
    return { sent: false, error: "Twilio not configured" };
  }

  try {
    const twilio = await import("twilio");
    const client = twilio.default(accountSid, authToken);
    await client.messages.create({ from, to, body });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to }, "SMS send failed");
    return { sent: false, error: message };
  }
}
