import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const soundsDir = path.resolve(__dirname, "../../public/sounds");

describe("notification-sounds", () => {
  it("bundles the chime sound file locally", () => {
    const fullPath = path.join(soundsDir, "chime.wav");
    assert.ok(fs.existsSync(fullPath), "missing chime.wav");
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 1000);
  });
});

describe("sound test button contract", () => {
  it("uses data-testid for test sound in sound card", () => {
    const pageSource = fs.readFileSync(
      path.resolve(__dirname, "../pages/dashboard/business/notifications.tsx"),
      "utf8",
    );
    assert.match(pageSource, /testTestId="test-notification-sound"/);
    assert.match(pageSource, /testId="notification-sound-card"/);
  });
});
