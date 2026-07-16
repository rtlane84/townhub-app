import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const scrollHelper = readFileSync(join(dir, "scroll-into-container.ts"), "utf8");
const card = readFileSync(
  join(dir, "../components/business-stripe-payments-card.tsx"),
  "utf8",
);

describe("stripe focus scroll + poll limits", () => {
  it("avoids Element.scrollIntoView for native focus", () => {
    assert.match(scrollHelper, /scrollElementIntoNearestContainer/);
    assert.match(scrollHelper, /data-native-scroll-root/);
    assert.match(scrollHelper, /scrollTo/);
  });

  it("retries Payments focus after Settings layout settles", () => {
    const settings = readFileSync(
      join(dir, "../pages/dashboard/business/settings.tsx"),
      "utf8",
    );
    assert.match(settings, /1400/);
    assert.match(settings, /isNativeApp\(\) \? "auto"/);
  });

  it("caps Connect polling and skips when tab is hidden", () => {
    assert.match(card, /maxTicks = 8/);
    assert.match(card, /visibilityState === "hidden"/);
    assert.match(card, /20_000/);
    assert.match(card, /this Settings Payments card is mounted/);
  });
});
