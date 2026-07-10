import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.resolve(__dirname, "../pages/dashboard/business/notifications.tsx");

describe("notifications page layout", () => {
  it("uses per-provider cards with inline save and test actions", () => {
    const pageSource = fs.readFileSync(pagePath, "utf8");
    assert.match(pageSource, /NotificationProviderCard/);
    assert.match(pageSource, /ProviderConnectionStatus/);
    assert.match(pageSource, /ProviderActionButtons/);
    assert.match(pageSource, /saveTestId="save-email-settings"/);
    assert.match(pageSource, /saveTestId="save-sms-settings"/);
    assert.match(pageSource, /saveTestId="save-discord-settings"/);
    assert.doesNotMatch(pageSource, /saveTestId="save-ntfy-settings"/);
    assert.match(pageSource, /showSave=\{false\}/);
    assert.match(pageSource, /testTestId="test-notification-email"/);
    assert.match(pageSource, /testTestId="test-notification-sms"/);
    assert.match(pageSource, /testTestId="test-notification-discord"/);
    assert.match(pageSource, /testTestId="test-notification-ntfy"/);
    assert.doesNotMatch(pageSource, /Test delivery/);
    assert.doesNotMatch(pageSource, /button-save-notification-delivery/);
  });
});

describe("ntfy phone notifications UI", () => {
  it("uses copy-topic setup instead of QR scanning", () => {
    const pageSource = fs.readFileSync(pagePath, "utf8");
    assert.match(pageSource, /Free phone notifications/);
    assert.doesNotMatch(pageSource, /NtfySubscriptionQr|QRCode|ntfy-qr/);
    assert.match(pageSource, /data-testid="copy-ntfy-topic"/);
    assert.match(pageSource, /testTestId="test-notification-ntfy"/);
    assert.match(pageSource, /Subscribe to topic/);
  });
});
