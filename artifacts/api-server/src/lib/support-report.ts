import { sendEmail, type EmailSendResult } from "./email";
import { logger } from "./logger";

export const DEFAULT_SUPPORT_INBOX_EMAIL = "Ronnie@LaneTechWV.com";

export type SupportReportCategory = "BUG" | "QUESTION" | "OTHER";

export type SupportReportPayload = {
  category: SupportReportCategory;
  message: string;
  contactEmail?: string;
  pagePath: string;
  userAgent?: string;
  clerkUserId?: string | null;
};

const CATEGORY_LABEL: Record<SupportReportCategory, string> = {
  BUG: "Bug",
  QUESTION: "Question",
  OTHER: "Other",
};

export function resolveSupportInboxEmail(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.SUPPORT_INBOX_EMAIL?.trim();
  return configured || DEFAULT_SUPPORT_INBOX_EMAIL;
}

export function formatSupportReportSubject(
  category: SupportReportCategory,
  pagePath: string,
): string {
  return `[TownHub report] ${CATEGORY_LABEL[category]} — ${pagePath}`;
}

export function formatSupportReportBody(payload: SupportReportPayload): string {
  const lines = [
    `Category: ${CATEGORY_LABEL[payload.category]}`,
    `Page: ${payload.pagePath}`,
    `Contact email: ${payload.contactEmail?.trim() || "(not provided)"}`,
    `Clerk user id: ${payload.clerkUserId?.trim() || "(anonymous)"}`,
    `User agent: ${payload.userAgent?.trim() || "(not provided)"}`,
    "",
    "Message:",
    payload.message.trim(),
  ];
  return lines.join("\n");
}

export type DeliverSupportReportResult =
  | { ok: true; emailed: boolean }
  | { ok: false; reason: "provider_unavailable" | "send_failed" };

/**
 * Emails the support inbox. Does not log message body, contact email, or other PII.
 */
export async function deliverSupportReport(
  payload: SupportReportPayload,
  options?: {
    send?: typeof sendEmail;
    env?: NodeJS.ProcessEnv;
    nodeEnv?: string;
  },
): Promise<DeliverSupportReportResult> {
  const env = options?.env ?? process.env;
  const nodeEnv = options?.nodeEnv ?? env.NODE_ENV ?? process.env.NODE_ENV;
  const send = options?.send ?? sendEmail;
  const to = resolveSupportInboxEmail(env);
  const subject = formatSupportReportSubject(payload.category, payload.pagePath);
  const body = formatSupportReportBody(payload);

  const result: EmailSendResult = await send(to, subject, body);

  if (result.sent) {
    logger.info(
      { category: payload.category, pagePath: payload.pagePath },
      "support_report_emailed",
    );
    return { ok: true, emailed: true };
  }

  if (result.providerUnavailable) {
    logger.info(
      { category: payload.category, pagePath: payload.pagePath },
      "support_report_accepted_email_unavailable",
    );
    // Local/dev without email still accepts so the UI can be exercised.
    if (nodeEnv !== "production") {
      return { ok: true, emailed: false };
    }
    return { ok: false, reason: "provider_unavailable" };
  }

  logger.info(
    { category: payload.category, pagePath: payload.pagePath },
    "support_report_email_failed",
  );
  return { ok: false, reason: "send_failed" };
}
