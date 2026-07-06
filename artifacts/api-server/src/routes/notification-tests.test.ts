import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("notification test API routes", () => {
  it("requires auth on email and SMS test endpoints", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "notification-tests.ts"),
      "utf8",
    );

    assert.match(source, /requireAuth/);
    assert.match(source, /authorizeBusinessOwnerOrAdmin/);
    assert.match(source, /notifications\/test\/email/);
    assert.match(source, /notifications\/test\/sms/);
    assert.match(source, /notifications\/test\/discord/);
  });

  it("logs test sends through notification delivery", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "notification-tests.ts"),
      "utf8",
    );

    assert.match(source, /deliverOwnerEmail/);
    assert.match(source, /deliverOwnerSms/);
    assert.match(source, /deliverOwnerDiscord/);
    assert.match(source, /deliverOwnerNtfy/);
    assert.match(source, /respondToTestDelivery/);
    assert.match(source, /notifications\/test\/ntfy/);
    assert.match(source, /notifications\/ntfy\/regenerate-topic/);
    assert.match(source, /eventType: "NEW_ORDER"/);
  });
});

describe("notification test route registration", () => {
  it("mounts notification test router", () => {
    const indexSource = fs.readFileSync(
      path.resolve(__dirname, "index.ts"),
      "utf8",
    );
    assert.match(indexSource, /notificationTestsRouter/);
  });
});
