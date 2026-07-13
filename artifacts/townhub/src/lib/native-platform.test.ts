import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDashboardRoute,
  isNativeTabRoute,
  isAccountRoute,
  isNavActive,
  isPullToRefreshRoute,
} from "./native-platform.ts";

describe("native-platform", () => {
  it("detects dashboard routes", () => {
    assert.equal(isDashboardRoute("/dashboard/business"), true);
    assert.equal(isDashboardRoute("/dashboard/business/orders"), true);
    assert.equal(isDashboardRoute("/dashboard/admin"), true);
    assert.equal(isDashboardRoute("/businesses"), false);
  });

  it("shows native tabs on browse, storefront, cart, and dashboards", () => {
    assert.equal(isNativeTabRoute("/"), true);
    assert.equal(isNativeTabRoute("/businesses"), true);
    assert.equal(isNativeTabRoute("/businesses/acme-bakery"), true);
    assert.equal(isNativeTabRoute("/events"), true);
    assert.equal(isNativeTabRoute("/food-trucks"), true);
    assert.equal(isNativeTabRoute("/cart"), true);
    assert.equal(isNativeTabRoute("/my-orders"), true);
    assert.equal(isNativeTabRoute("/order/abc"), true);
    assert.equal(isNativeTabRoute("/dashboard/business"), true);
    assert.equal(isNativeTabRoute("/dashboard/admin"), true);
    assert.equal(isNativeTabRoute("/dashboard/admin/settings"), true);
  });

  it("keeps dashboard route detection for hub-only chrome", () => {
    assert.equal(isDashboardRoute("/dashboard/business"), true);
    assert.equal(isDashboardRoute("/dashboard/admin/settings"), true);
    assert.equal(isDashboardRoute("/businesses"), false);
  });

  it("marks account routes", () => {
    assert.equal(isAccountRoute("/help"), true);
    assert.equal(isAccountRoute("/sign-in"), true);
    assert.equal(isAccountRoute("/cart"), false);
  });

  it("resolves active nav paths", () => {
    assert.equal(isNavActive("/events", "/events"), true);
    assert.equal(isNavActive("/events/summer", "/events"), true);
    assert.equal(isNavActive("/businesses", "/events"), false);
    assert.equal(isNavActive("/", "/"), true);
    assert.equal(isNavActive("/businesses", "/"), false);
    assert.equal(isNavActive("/businesses/acme", "/businesses"), true);
  });

  it("enables pull to refresh on public listing routes and kitchen display", () => {
    assert.equal(isPullToRefreshRoute("/"), true);
    assert.equal(isPullToRefreshRoute("/events"), true);
    assert.equal(isPullToRefreshRoute("/cart"), false);
    assert.equal(isPullToRefreshRoute("/businesses/acme"), false);
    assert.equal(isPullToRefreshRoute("/dashboard/admin"), false);
    assert.equal(isPullToRefreshRoute("/dashboard/business/kitchen"), true);
    assert.equal(isPullToRefreshRoute("/dashboard/business/orders"), false);
  });
});
