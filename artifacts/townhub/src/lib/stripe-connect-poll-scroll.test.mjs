import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const card = readFileSync(
  join(dir, "../components/business-stripe-payments-card.tsx"),
  "utf8",
);
const settings = readFileSync(
  join(dir, "../pages/dashboard/business/settings.tsx"),
  "utf8",
);
const banner = readFileSync(
  join(dir, "../components/stripe-connect-alert-banner.tsx"),
  "utf8",
);

describe("stripe Connect Settings UX", () => {
  it("opens Settings without scroll-to-Payments focus", () => {
    assert.match(banner, /setLocation\("\/dashboard\/business\/settings"\)/);
    assert.doesNotMatch(banner, /stripeFocus/);
    assert.doesNotMatch(settings, /shouldFocusStripe/);
    assert.doesNotMatch(settings, /scrollIntoView|scrollElementIntoNearestContainer/);
  });

  it("caps Connect polling and skips when tab is hidden", () => {
    assert.match(card, /maxTicks = 8/);
    assert.match(card, /visibilityState === "hidden"/);
    assert.match(card, /20_000/);
    assert.match(card, /this Settings Payments card is mounted/);
  });
});
