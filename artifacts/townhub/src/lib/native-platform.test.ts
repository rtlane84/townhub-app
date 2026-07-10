import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

  it("shows native tabs on primary browse routes", () => {
    assert.equal(isNativeTabRoute("/"), true);
    assert.equal(isNativeTabRoute("/businesses"), true);
    assert.equal(isNativeTabRoute("/events"), true);
    assert.equal(isNativeTabRoute("/food-trucks"), true);
    assert.equal(isNativeTabRoute("/my-orders"), true);
  });

  it("hides native tabs on storefront and checkout flows", () => {
    assert.equal(isNativeTabRoute("/businesses/acme-bakery"), false);
    assert.equal(isNativeTabRoute("/cart"), false);
    assert.equal(isNativeTabRoute("/order/abc"), false);
  });

  it("shows native tabs on business and admin dashboards", () => {
    assert.equal(isNativeTabRoute("/dashboard/business"), true);
    assert.equal(isNativeTabRoute("/dashboard/business/orders"), true);
    assert.equal(isNativeTabRoute("/dashboard/admin"), true);
    assert.equal(isNativeTabRoute("/dashboard/admin/settings"), true);
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
  });

  it("enables pull to refresh only on public listing routes", () => {
    assert.equal(isPullToRefreshRoute("/"), true);
    assert.equal(isPullToRefreshRoute("/events"), true);
    assert.equal(isPullToRefreshRoute("/cart"), false);
    assert.equal(isPullToRefreshRoute("/dashboard/admin"), false);
  });
});
