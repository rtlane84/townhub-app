import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("ensure-launch-subscription-plans", () => {
  it("documents Presence and Orders feature maps", async () => {
    const source = await readFile(
      new URL("./ensure-launch-subscription-plans.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /LAUNCH_PLAN_PRESENCE_NAME = "Presence"/);
    assert.match(source, /LAUNCH_PLAN_ORDERS_NAME = "Orders"/);
    assert.match(source, /monthlyPrice: "25\.00"/);
    assert.match(source, /monthlyPrice: "40\.00"/);
    assert.match(source, /ONLINE_ORDERING/);
    assert.match(source, /SMS_NOTIFICATIONS/);
    assert.match(source, /ensureDefaultSubscriptionFeatures/);
  });
});
