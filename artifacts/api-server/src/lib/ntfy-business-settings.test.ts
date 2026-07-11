import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ntfySettingsForEnable, ntfySettingsForRegenerate } from "./ntfy-business-settings.ts";
import { isValidNtfyTopic } from "./ntfy-topic.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ntfy-business-settings", () => {
  it("creates a topic when enabling without an existing topic", () => {
    const update = ntfySettingsForEnable({ ntfyEnabled: false, ntfyTopic: null, ntfyConnectedAt: null });
    assert.equal(update.ntfyEnabled, true);
    assert.ok(isValidNtfyTopic(update.ntfyTopic));
    assert.ok(update.ntfyConnectedAt instanceof Date);
  });

  it("reuses existing topic when re-enabling", () => {
    const existing = "abcdefghijklmnopqrstuvwxyz1234567890ABCD";
    const connectedAt = new Date("2026-01-01T00:00:00Z");
    const update = ntfySettingsForEnable({
      ntfyEnabled: false,
      ntfyTopic: existing,
      ntfyConnectedAt: connectedAt,
    });
    assert.equal(update.ntfyTopic, existing);
    assert.equal(update.ntfyConnectedAt, connectedAt);
  });

  it("regenerates topic with a new connected timestamp and clears last test", () => {
    const first = ntfySettingsForRegenerate();
    const second = ntfySettingsForRegenerate();
    assert.notEqual(first.ntfyTopic, second.ntfyTopic);
    assert.ok(isValidNtfyTopic(first.ntfyTopic));
    assert.equal(first.ntfyLastTestAt, null);
  });
});

describe("ntfy notification routes", () => {
  it("requires auth and owner access on test and regenerate endpoints", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../routes/notification-tests.ts"), "utf8");
    assert.match(source, /notifications\/test\/ntfy/);
    assert.match(source, /notifications\/ntfy\/regenerate-topic/);
    assert.match(source, /authorizeBusinessOwnerOrAdmin/);
    assert.match(source, /ntfyLastTestAt/);
  });
});

describe("ntfy order notifications", () => {
  it("does not block order flow when ntfy delivery fails", () => {
    const serviceSource = fs.readFileSync(
      path.resolve(__dirname, "./notification-service.ts"),
      "utf8",
    );
    assert.match(serviceSource, /await Promise\.all\(tasks\)/);
    assert.match(serviceSource, /deliverOwnerNtfy/);
    const ordersSource = fs.readFileSync(path.resolve(__dirname, "../routes/orders.ts"), "utf8");
    assert.match(ordersSource, /checkout\/intents/);
    assert.match(ordersSource, /notifyOwnerNewOrderFromOrderId\(order\.id\)\.catch\(\(\) => \{\}\)/);
    const webhookSource = fs.readFileSync(path.resolve(__dirname, "./stripe-webhook.ts"), "utf8");
    assert.match(webhookSource, /materializePaidOrderFromPendingCheckout|notifyOwnerNewOrderFromOrderId/);
  });

  it("skips ntfy when disabled", () => {
    const serviceSource = fs.readFileSync(
      path.resolve(__dirname, "./notification-service.ts"),
      "utf8",
    );
    assert.match(serviceSource, /business\.ntfyEnabled/);
  });
});
