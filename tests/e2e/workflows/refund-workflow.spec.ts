import { test, expect } from "../fixtures/test.fixture";
import {
  OWNER_AUTH_SKIP_REASON,
  hasOwnerAuthState,
  ownerAuthStatePath,
} from "../helpers/auth";
import { fetchOrderById } from "../helpers/api";
import {
  findOwnerStripeCheckoutBusiness,
  isStripeCheckoutE2EEnabled,
  placeGuestCardOrder,
  STRIPE_CHECKOUT_SKIP_REASON,
  waitForOrderPaid,
} from "../helpers/stripe-checkout";
import { issueFullRefundViaUi, waitForOrderRefunded } from "../helpers/refunds";
import { createAuthedApiContext } from "../helpers/authed-api";
import { gotoOrderConfirmation } from "../helpers/navigation";

test.describe("Refund workflow", () => {
  test.setTimeout(240_000);

  test.beforeEach(() => {
    test.skip(!isStripeCheckoutE2EEnabled(), STRIPE_CHECKOUT_SKIP_REASON);
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);
  });

  test("owner can refund a paid Stripe order and customer order reflects refund status", async ({
    page,
    browser,
  }) => {
    const ownerContext = await createAuthedApiContext(browser, ownerAuthStatePath());
    const ownerPage = await ownerContext.newPage();
    const stripeBusiness = await findOwnerStripeCheckoutBusiness(ownerPage);

    try {
      const { orderId, accessToken } = await placeGuestCardOrder(page, stripeBusiness);
      await waitForOrderPaid(orderId, accessToken);

      await issueFullRefundViaUi(ownerPage, orderId);
      await waitForOrderRefunded(orderId, accessToken);

      const refundedOrder = await fetchOrderById(orderId, accessToken);
      expect(refundedOrder.refundStatus === "FULL" || refundedOrder.paymentStatus === "REFUNDED").toBeTruthy();

      const customerPage = await page.context().newPage();
      await gotoOrderConfirmation(customerPage, orderId, accessToken!);
      await expect(customerPage.getByRole("heading", { name: "Order Received!" })).toBeVisible();
      await customerPage.close();
    } finally {
      await ownerPage.close();
      await ownerContext.close();
    }
  });
});
