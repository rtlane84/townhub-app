import { logger } from "./logger";

function emailFromAddress(): string | null {
  return process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? null;
}

export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY && emailFromAddress()) return true;
  if (process.env.SMTP_HOST && emailFromAddress()) return true;
  return false;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> {
  const from = emailFromAddress();
  if (!from) {
    logger.info("Email not configured: missing RESEND_FROM or SMTP_FROM");
    return { sent: false, error: "Email sender not configured" };
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from,
        to,
        subject,
        text: body,
      });
      if (result.error) {
        return { sent: false, error: result.error.message };
      }
      return { sent: true };
    }

    if (process.env.SMTP_HOST) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
      await transporter.sendMail({ from, to, subject, text: body });
      return { sent: true };
    }

    logger.info("Email not configured: set RESEND_API_KEY or SMTP_HOST");
    return { sent: false, error: "No email provider configured" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, to, subject }, "Email send failed");
    return { sent: false, error: message };
  }
}
