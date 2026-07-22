import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("ensure-launch-subscription-plans", () => {
  it("documents Business Showcase and Business Ordering feature maps", async () => {
    const source = await readFile(
      new URL("./ensure-launch-subscription-plans.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /LAUNCH_PLAN_SHOWCASE_NAME = "Business Showcase"/);
    assert.match(source, /LAUNCH_PLAN_ORDERING_NAME = "Business Ordering"/);
    assert.match(source, /monthlyPrice: "20\.00"/);
    assert.match(source, /monthlyPrice: "40\.00"/);
    assert.match(source, /trialDays: 14/);
    assert.match(source, /LEGACY_SHOWCASE_PLAN_NAMES = \["Presence"\]/);
    assert.match(source, /ONLINE_ORDERING/);
    assert.match(source, /SMS_NOTIFICATIONS/);
    assert.match(source, /ensureDefaultSubscriptionFeatures/);
  });
});
