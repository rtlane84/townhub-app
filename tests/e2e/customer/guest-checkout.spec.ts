import { test, expect } from "../fixtures/test.fixture";
import {
  addFirstProductToCart,
  fillGuestCheckoutForm,
  openCartFromStorefront,
  submitPayAtPickupCheckout,
} from "../helpers/cart";
import { gotoStorefront } from "../helpers/navigation";
import {
  expectCartContainsProduct,
  expectCheckoutTotalsVisible,
  expectOrderConfirmationWithToken,
} from "../helpers/assertions";

test.describe("Guest cart and checkout", () => {
  test("item can be added to cart and totals are shown", async ({ page, checkoutBusiness }) => {
    await gotoStorefront(page, checkoutBusiness.slug);
    await addFirstProductToCart(page, checkoutBusiness);
    await openCartFromStorefront(page);

    await expectCartContainsProduct(page, checkoutBusiness);
    await expectCheckoutTotalsVisible(page);

    const subtotalRow = page.locator("text=Subtotal").locator("..");
    await expect(subtotalRow).toContainText(checkoutBusiness.product.price.toFixed(2));
  });

  test("guest pay-at-pickup checkout completes with order access token", async ({
    page,
    checkoutBusiness,
  }) => {
    await gotoStorefront(page, checkoutBusiness.slug);
    await addFirstProductToCart(page, checkoutBusiness);
    await openCartFromStorefront(page);

    await fillGuestCheckoutForm(page);
    await submitPayAtPickupCheckout(page);

    const { orderId, token } = await expectOrderConfirmationWithToken(page);

    await expect(page.getByText(checkoutBusiness.name).first()).toBeVisible();
    await expect(page.getByText(/pay at pickup\/delivery/i)).toBeVisible();

    // Token must work for guest order fetch via URL (reload without losing access)
    await page.reload();
    await expect(page.getByRole("heading", { name: "Order Received!" })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("token")).toBe(token);
    expect(Number(new URL(page.url()).pathname.split("/").pop())).toBe(orderId);
  });
});
