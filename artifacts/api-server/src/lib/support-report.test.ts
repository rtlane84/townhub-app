import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailSendResult } from "./email";
import {
  DEFAULT_SUPPORT_INBOX_EMAIL,
  deliverSupportReport,
  formatSupportReportBody,
  formatSupportReportSubject,
  resolveSupportInboxEmail,
} from "./support-report";

describe("support report helpers", () => {
  it("uses SUPPORT_INBOX_EMAIL when set", () => {
    assert.equal(
      resolveSupportInboxEmail({ SUPPORT_INBOX_EMAIL: " ops@example.com " }),
      "ops@example.com",
    );
  });

  it("defaults to the LaneTech inbox", () => {
    assert.equal(resolveSupportInboxEmail({}), DEFAULT_SUPPORT_INBOX_EMAIL);
  });

  it("formats subject with category label and page path", () => {
    assert.equal(
      formatSupportReportSubject("BUG", "/businesses/cafe"),
      "[TownHub report] Bug — /businesses/cafe",
    );
    assert.equal(
      formatSupportReportSubject("QUESTION", "/help"),
      "[TownHub report] Question — /help",
    );
  });

  it("formats body with context fields", () => {
    const body = formatSupportReportBody({
      category: "BUG",
      message: "Checkout button stuck",
      contactEmail: "customer@example.com",
      pagePath: "/cart",
      userAgent: "TestAgent/1.0",
      clerkUserId: "user_123",
    });
    assert.match(body, /Category: Bug/);
    assert.match(body, /Page: \/cart/);
    assert.match(body, /Contact email: customer@example.com/);
    assert.match(body, /Clerk user id: user_123/);
    assert.match(body, /User agent: TestAgent\/1\.0/);
    assert.match(body, /Checkout button stuck/);
  });
});

describe("deliverSupportReport", () => {
  const payload = {
    category: "BUG" as const,
    message: "Something broke",
    pagePath: "/businesses/demo",
  };

  it("returns ok when email sends", async () => {
    const result = await deliverSupportReport(payload, {
      send: async () => ({ sent: true }),
      nodeEnv: "production",
    });
    assert.deepEqual(result, { ok: true, emailed: true });
  });

  it("accepts without email outside production when provider is unavailable", async () => {
    const result = await deliverSupportReport(payload, {
      send: async (): Promise<EmailSendResult> => ({
        sent: false,
        providerUnavailable: true,
      }),
      nodeEnv: "development",
    });
    assert.deepEqual(result, { ok: true, emailed: false });
  });

  it("fails closed in production when email is unavailable", async () => {
    const result = await deliverSupportReport(payload, {
      send: async (): Promise<EmailSendResult> => ({
        sent: false,
        providerUnavailable: true,
      }),
      nodeEnv: "production",
    });
    assert.deepEqual(result, { ok: false, reason: "provider_unavailable" });
  });

  it("fails when the provider returns an error", async () => {
    const result = await deliverSupportReport(payload, {
      send: async (): Promise<EmailSendResult> => ({
        sent: false,
        error: "boom",
      }),
      nodeEnv: "production",
    });
    assert.deepEqual(result, { ok: false, reason: "send_failed" });
  });
});
