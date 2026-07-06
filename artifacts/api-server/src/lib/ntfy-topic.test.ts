import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { generateNtfyTopic, isValidNtfyTopic, redactNtfyTopic } from "./ntfy-topic.ts";
import { buildNtfySubscriptionUrl, getNtfyServerUrl } from "./ntfy-config.ts";

describe("ntfy-topic", () => {
  it("generates URL-safe topics with at least 32 characters", () => {
    const topic = generateNtfyTopic();
    assert.ok(topic.length >= 32);
    assert.match(topic, /^[A-Za-z0-9_-]+$/);
  });

  it("generates unique topics", () => {
    const a = generateNtfyTopic();
    const b = generateNtfyTopic();
    assert.notEqual(a, b);
  });

  it("validates topic format", () => {
    const topic = generateNtfyTopic();
    assert.equal(isValidNtfyTopic(topic), true);
    assert.equal(isValidNtfyTopic("short"), false);
    assert.equal(isValidNtfyTopic(""), false);
    assert.equal(isValidNtfyTopic("has spaces in topic name!!!!!!!!!!"), false);
  });

  it("redacts topics for logs", () => {
    const topic = generateNtfyTopic();
    const redacted = redactNtfyTopic(topic);
    assert.match(redacted, /^ntfy:[A-Za-z0-9_-]{4}…$/);
    assert.ok(!redacted.includes(topic));
  });
});

describe("ntfy-config", () => {
  const previous = process.env.NTFY_SERVER_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.NTFY_SERVER_URL;
    else process.env.NTFY_SERVER_URL = previous;
  });

  it("builds subscription URLs from configured server", () => {
    process.env.NTFY_SERVER_URL = "https://ntfy.sh/";
    const topic = "abc123_def-456ghijklmnopqrstuvwxyz12";
    assert.equal(buildNtfySubscriptionUrl(topic), `https://ntfy.sh/${topic}`);
  });

  it("defaults to public ntfy.sh when unset", () => {
    delete process.env.NTFY_SERVER_URL;
    assert.equal(getNtfyServerUrl(), "https://ntfy.sh");
  });
});
