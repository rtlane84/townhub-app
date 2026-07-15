import { test, expect } from "../fixtures/test.fixture";
import { gotoBusinesses, gotoHome, gotoStorefront } from "../helpers/navigation";
import { expectPageHeading } from "../helpers/assertions";

test.describe("Public pages smoke", () => {
  test("homepage loads", async ({ page }) => {
    await gotoHome(page);
    await expect(page).toHaveTitle(/TownHub|Local/i);
    await expect(page.getByRole("link", { name: /businesses/i }).first()).toBeVisible();
  });

  test("businesses directory loads", async ({ page }) => {
    await gotoBusinesses(page);
    await expectPageHeading(page, "Local businesses");
    await expect(page.getByRole("searchbox", { name: "Search businesses" })).toBeVisible();
  });

  test("storefront loads for a checkout-ready business", async ({ page, checkoutBusiness }) => {
    await gotoStorefront(page, checkoutBusiness.slug);
    await expect(page.getByRole("heading", { name: checkoutBusiness.name })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(checkoutBusiness.product.name, { exact: true })).toBeVisible();
  });
});
