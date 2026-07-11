import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const settingsSource = readFileSync(
  join(packageRoot, "src/pages/dashboard/business/settings.tsx"),
  "utf8",
);
const storefrontSource = readFileSync(
  join(packageRoot, "src/pages/storefront.tsx"),
  "utf8",
);
const cartSource = readFileSync(join(packageRoot, "src/pages/cart.tsx"), "utf8");

describe("business order timing settings copy", () => {
  it("uses Order timing with minimum prep and optional delivery buffer", () => {
    assert.match(settingsSource, /title="Order timing"/);
    assert.match(settingsSource, /Minimum prep time \(minutes\)/);
    assert.match(settingsSource, /Delivery buffer \(minutes\)/);
    const prepIdx = settingsSource.indexOf("Minimum prep time (minutes)");
    const bufferIdx = settingsSource.indexOf("Delivery buffer (minutes)");
    assert.ok(prepIdx > 0);
    assert.ok(bufferIdx > prepIdx);
  });

  it("explains prep and delivery buffer in plain language", () => {
    assert.match(
      settingsSource,
      /The minimum time needed to prepare any order\. If a menu item requires more time, we'll automatically use the longer time\./,
    );
    assert.match(
      settingsSource,
      /Extra time added only to delivery orders for packing, driver dispatch, and travel\./,
    );
  });

  it("includes a How order timing works card", () => {
    assert.match(settingsSource, /data-testid="order-timing-summary"/);
    assert.match(settingsSource, /How order timing works/);
    assert.match(settingsSource, /Every order starts with your minimum prep time\./);
    assert.match(
      settingsSource,
      /Larger orders may automatically receive a few extra preparation minutes\./,
    );
  });

  it("clarifies delivery area is informational", () => {
    assert.match(settingsSource, /Shown to customers as your normal delivery area\./);
    assert.match(settingsSource, /Orders outside this area are not automatically blocked\./);
  });

  it("removes fixed same-day cutoff from settings, storefront, and cart", () => {
    assert.doesNotMatch(settingsSource, /Last same-day order/);
    assert.doesNotMatch(settingsSource, /orderCutoffTime/);
    assert.doesNotMatch(settingsSource, /input-orderCutoffTime/);
    assert.doesNotMatch(storefrontSource, /orderCutoffTime/);
    assert.doesNotMatch(storefrontSource, /cutoffLabel/);
    assert.doesNotMatch(cartSource, /orderCutoffTime/);
    assert.doesNotMatch(cartSource, /Order by /);
  });

  it("uses friendly ordering availability labels", () => {
    assert.match(settingsSource, /Choose when customers are allowed to place new orders\./);
    assert.match(settingsSource, /Customers can order whenever your business is active\./);
    assert.match(settingsSource, /Customers can order only during today's business hours\./);
    assert.match(
      settingsSource,
      /Customers can order only while an active scheduled location is open\./,
    );
    assert.match(settingsSource, /Turn online ordering on or off yourself\./);
  });

  it("shows relative closing buffer only for hours and mobile modes", () => {
    assert.match(settingsSource, /Stop accepting new orders/);
    assert.match(settingsSource, /minutes before closing/);
    assert.match(
      settingsSource,
      /Prevents new ASAP orders shortly before today's business hours or active mobile location ends\./,
    );
    assert.match(settingsSource, /input-orderClosingBufferMinutes/);
    assert.match(
      settingsSource,
      /orderingAvailabilityMode === "BUSINESS_HOURS" \|\|[\s\S]*orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE"/,
    );
  });
});
