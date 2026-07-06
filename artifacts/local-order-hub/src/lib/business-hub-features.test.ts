import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUSINESS_HUB_NAV_ITEMS,
  BUSINESS_HUB_NAV_SECTIONS,
  getVisibleBusinessHubNavItems,
  isBusinessHubRouteHiddenByStorefrontMode,
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

  it("lists all primary hub sections in nav catalog", () => {
    const hrefs = BUSINESS_HUB_NAV_ITEMS.map((item) => item.href);
    assert.ok(hrefs.includes("/dashboard/business/orders"));
    assert.ok(hrefs.includes("/dashboard/business/appointments"));
    assert.ok(hrefs.includes("/dashboard/business/locations"));
  });

  it("groups sidebar items into business, catalog, and configuration sections", () => {
    const labels = BUSINESS_HUB_NAV_SECTIONS.map((section) => section.label);
    assert.deepEqual(labels, ["Business", "Catalog", "Configuration"]);
    const grouped = new Set(BUSINESS_HUB_NAV_SECTIONS.flatMap((section) => section.hrefs));
    for (const item of BUSINESS_HUB_NAV_ITEMS) {
      assert.ok(grouped.has(item.href), `missing nav section for ${item.href}`);
    }
  });

  it("shows ordering tabs only for ORDERING storefront mode", () => {
    const ordering = getVisibleBusinessHubNavItems("ORDERING");
    const hrefs = ordering.map((item) => item.href);
    assert.ok(hrefs.includes("/dashboard/business/orders"));
    assert.ok(hrefs.includes("/dashboard/business/kitchen"));
    assert.ok(!hrefs.includes("/dashboard/business/appointments"));
  });

  it("shows appointments only for APPOINTMENT storefront mode", () => {
    const appointment = getVisibleBusinessHubNavItems("APPOINTMENT");
    const hrefs = appointment.map((item) => item.href);
    assert.ok(hrefs.includes("/dashboard/business/appointments"));
    assert.ok(!hrefs.includes("/dashboard/business/orders"));
    assert.ok(hrefs.includes("/dashboard/business/products"));
  });

  it("hides commerce tabs for INFORMATION storefront mode", () => {
    const information = getVisibleBusinessHubNavItems("INFORMATION");
    const hrefs = information.map((item) => item.href);
    assert.ok(!hrefs.includes("/dashboard/business/orders"));
    assert.ok(!hrefs.includes("/dashboard/business/appointments"));
    assert.ok(hrefs.includes("/dashboard/business/products"));
  });

  it("hides appointments route when storefront mode is online ordering", () => {
    assert.equal(
      isBusinessHubRouteHiddenByStorefrontMode("/dashboard/business/appointments", "ORDERING"),
      true,
    );
    assert.equal(
      isBusinessHubRouteHiddenByStorefrontMode("/dashboard/business/orders", "ORDERING"),
      false,
    );
  });
});
