import { test, expect } from "../fixtures/test.fixture";
import {
  OWNER_AUTH_SKIP_REASON,
  hasOwnerAuthState,
  ownerAuthStatePath,
} from "../helpers/auth";
import {
  findOwnerStripeCheckoutBusiness,
  isStripeCheckoutE2EEnabled,
  placeGuestCardOrder,
  STRIPE_CHECKOUT_SKIP_REASON,
  waitForOrderPaid,
} from "../helpers/stripe-checkout";
import { gotoOwnerDashboard } from "../helpers/navigation";
import { createAuthedApiContext } from "../helpers/authed-api";

test.describe("Stripe checkout workflow", () => {
  test.beforeEach(() => {
    test.skip(!isStripeCheckoutE2EEnabled(), STRIPE_CHECKOUT_SKIP_REASON);
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);
  });

  test("guest card checkout becomes PAID and owner dashboard reflects payment", async ({
    page,
    browser,
  }) => {
    const ownerContext = await createAuthedApiContext(browser, ownerAuthStatePath());
    const ownerPage = await ownerContext.newPage();
    const stripeBusiness = await findOwnerStripeCheckoutBusiness(ownerPage);

    try {
      const { orderId, accessToken } = await placeGuestCardOrder(page, stripeBusiness);
      expect(orderId).toBeGreaterThan(0);

      await waitForOrderPaid(orderId, accessToken);

      await gotoOwnerDashboard(ownerPage, "/dashboard/business/orders");
      const orderRow = ownerPage.getByTestId(`row-order-${orderId}`);
      await expect(orderRow).toBeVisible({ timeout: 30_000 });
      await expect(orderRow.getByTestId("payment-flag-paid")).toBeVisible();
    } finally {
      await ownerPage.close();
      await ownerContext.close();
    }
  });
});
