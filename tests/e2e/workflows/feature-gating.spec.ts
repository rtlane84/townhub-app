import { adminTest as test, expect } from "../fixtures/auth.fixture";
import { ADMIN_AUTH_SKIP_REASON, hasAdminAuthState } from "../helpers/auth";
import { findCheckoutBusiness } from "../helpers/api";
import {
  addFirstProductToCart,
  fillGuestCheckoutForm,
  openCartFromStorefront,
  submitPayAtPickupCheckout,
} from "../helpers/cart";
import { gotoStorefront } from "../helpers/navigation";
import {
  getBusinessSubscriptionPlanId,
  setOnlineOrderingEnabled,
  setPlanFeatureIds,
  snapshotPlanFeatures,
} from "../helpers/features";
import { e2eApiUrl } from "../helpers/env";
import { gotoAdminDashboard } from "../helpers/navigation";

test.describe("Feature gating workflow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!hasAdminAuthState(), ADMIN_AUTH_SKIP_REASON);
  });

  test("disabling online ordering blocks checkout and re-enabling restores it", async ({ page }) => {
    await gotoAdminDashboard(page, "/dashboard/admin/system-status");
    await page.getByRole("heading", { name: "Operations Center" }).waitFor({ state: "visible" });

    const checkoutBusiness = await findCheckoutBusiness();
    const planId = await getBusinessSubscriptionPlanId(page, checkoutBusiness.id);
    const originalFeatureIds = await snapshotPlanFeatures(page, planId);

    const guestContext = await page.context().browser()!.newContext();
    await guestContext.addInitScript(() => {
      localStorage.removeItem("local-order-hub-cart");
    });
    const guestPage = await guestContext.newPage();

    try {
      await setOnlineOrderingEnabled(page, planId, false);

      await gotoStorefront(guestPage, checkoutBusiness.slug);
      // Cart and add-to-cart must be hidden when the plan lacks online_ordering —
      // not only fail at checkout.
      await expect(guestPage.getByRole("button", { name: /^Add$/i })).toHaveCount(0);

      const blockedResponse = await fetch(`${e2eApiUrl()}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: checkoutBusiness.id,
          fulfillmentType: "PICKUP",
          customerName: "E2E Gate",
          customerEmail: "e2e-gate@example.com",
          customerPhone: "555-010-0001",
          paymentMethod: "IN_PERSON",
          items: [{ productId: checkoutBusiness.product.id, quantity: 1 }],
        }),
      });
      expect(blockedResponse.status).toBe(403);

      await setOnlineOrderingEnabled(page, planId, true);

      await gotoStorefront(guestPage, checkoutBusiness.slug);
      await addFirstProductToCart(guestPage, checkoutBusiness);
      await openCartFromStorefront(guestPage);
      await fillGuestCheckoutForm(guestPage);
      await submitPayAtPickupCheckout(guestPage);
      await expect(guestPage.getByRole("heading", { name: "Order Received!" })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await setPlanFeatureIds(page, planId, originalFeatureIds);
      await guestPage.close();
      await guestContext.close();
    }
  });
});
