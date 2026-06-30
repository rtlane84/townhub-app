import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUSINESS_HUB_NAV_ITEMS,
  resolveBusinessHubFeatureKey,
} from "./business-hub-features.ts";

describe("business-hub-features", () => {
  it("maps nested order routes to online_ordering", () => {
    assert.equal(
      resolveBusinessHubFeatureKey("/dashboard/business/orders/42"),
      "online_ordering",
    );
  });

  it("maps appointments to appointment_requests", () => {
    assert.equal(
      resolveBusinessHubFeatureKey("/dashboard/business/appointments"),
      "appointment_requests",
    );
  });

  it("leaves overview and settings unrestricted", () => {
    assert.equal(resolveBusinessHubFeatureKey("/dashboard/business"), null);
    assert.equal(resolveBusinessHubFeatureKey("/dashboard/business/settings"), null);
  });

  it("lists all primary hub sections in nav", () => {
    const hrefs = BUSINESS_HUB_NAV_ITEMS.map((item) => item.href);
    assert.ok(hrefs.includes("/dashboard/business/orders"));
    assert.ok(hrefs.includes("/dashboard/business/appointments"));
    assert.ok(hrefs.includes("/dashboard/business/locations"));
  });
});
