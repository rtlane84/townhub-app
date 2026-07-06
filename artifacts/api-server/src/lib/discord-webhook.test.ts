import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidDiscordWebhookUrl,
  normalizeDiscordWebhookUrl,
} from "./discord-webhook.ts";

const VALID_WEBHOOK =
  "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz1234567890";

describe("discord-webhook", () => {
  it("accepts valid Discord webhook URLs", () => {
    assert.equal(isValidDiscordWebhookUrl(VALID_WEBHOOK), true);
    assert.equal(
      isValidDiscordWebhookUrl("https://discordapp.com/api/webhooks/99/abc-def_123"),
      true,
    );
  });

  it("rejects invalid or unsafe URLs", () => {
    assert.equal(isValidDiscordWebhookUrl(""), false);
    assert.equal(isValidDiscordWebhookUrl("http://discord.com/api/webhooks/1/x"), false);
    assert.equal(isValidDiscordWebhookUrl("https://example.com/api/webhooks/1/x"), false);
    assert.equal(isValidDiscordWebhookUrl("https://discord.com/api/webhooks/not-numeric/x"), false);
  });

  it("normalizes valid URLs and strips trailing slashes", () => {
    assert.equal(normalizeDiscordWebhookUrl(`${VALID_WEBHOOK}/`), VALID_WEBHOOK);
    assert.equal(normalizeDiscordWebhookUrl("  "), null);
    assert.equal(normalizeDiscordWebhookUrl("https://evil.test/hook"), null);
  });
});
