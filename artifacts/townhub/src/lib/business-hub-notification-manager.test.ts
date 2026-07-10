import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergePendingAppointments,
  mergePendingOrders,
  shouldShowAppointmentNotificationBanner,
  shouldShowOrderNotificationBanner,
  shouldUseOwnerDashboardPolling,
} from "./business-hub-notification-manager.ts";
import {
  isBusinessHubAppointmentLivePage,
  isBusinessHubOrderLivePage,
} from "./business-hub-features.ts";

describe("business-hub notification routing", () => {
  it("treats overview, orders, and kitchen as order live pages", () => {
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business"), true);
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business/orders"), true);
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business/kitchen"), true);
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business/orders/42"), true);
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business/settings"), false);
    assert.equal(isBusinessHubOrderLivePage("/dashboard/business/products"), false);
  });

  it("shows order banners only on non-live business hub pages", () => {
    assert.equal(shouldShowOrderNotificationBanner("/dashboard/business/kitchen"), false);
    assert.equal(shouldShowOrderNotificationBanner("/dashboard/business/settings"), true);
  });

  it("shows appointment banners only off the appointments page", () => {
    assert.equal(isBusinessHubAppointmentLivePage("/dashboard/business/appointments"), true);
    assert.equal(shouldShowAppointmentNotificationBanner("/dashboard/business/appointments"), false);
    assert.equal(shouldShowAppointmentNotificationBanner("/dashboard/business/settings"), true);
  });

  it("polls on non-live pages and only falls back on live pages when SSE is down", () => {
    assert.equal(shouldUseOwnerDashboardPolling(false, "disconnected", false), true);
    assert.equal(shouldUseOwnerDashboardPolling(true, "live", true), false);
    assert.equal(shouldUseOwnerDashboardPolling(true, "fallback", true), true);
  });

  it("merges pending orders and appointments without duplicates", () => {
    const mergedOrders = mergePendingOrders(
      [{ id: 1 }, { id: 2 }] as never,
      [{ id: 2 }, { id: 3 }] as never,
    );
    assert.deepEqual(
      mergedOrders.map((entry) => entry.id),
      [3, 2, 1],
    );

    const mergedAppointments = mergePendingAppointments(
      [{ id: 4 }] as never,
      [{ id: 4 }, { id: 5 }] as never,
    );
    assert.deepEqual(
      mergedAppointments.map((entry) => entry.id),
      [5, 4],
    );
  });
});
