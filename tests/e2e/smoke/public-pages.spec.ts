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

  test("business sales page shows both plans and the application CTA", async ({ page }) => {
    await page.goto("/for-businesses");
    await expect(page.getByRole("heading", { name: /put your business\.?\s*where clay looks first/i })).toBeVisible();
    await expect(page.getByText("Business Showcase", { exact: true })).toBeVisible();
    await expect(page.getByText("Business Ordering", { exact: true })).toBeVisible();
    await expect(page.getByText("Orders you manage", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /list your business/i }).first()).toHaveAttribute("href", "/list-your-business");
    await expect(page.getByRole("link", { name: /message us on facebook/i }).first()).toHaveAttribute("href", "https://www.facebook.com/LaneTechLLC");
    await expect(page.locator("main").innerText()).resolves.not.toMatch(/[\-–—]/);
  });

  test("business sales page stays within a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/for-businesses");
    await expect(page.getByText("Orders you manage", { exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });

  test("storefront loads for a checkout-ready business", async ({ page, checkoutBusiness }) => {
    await gotoStorefront(page, checkoutBusiness.slug);
    await expect(page.getByRole("heading", { name: checkoutBusiness.name })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(checkoutBusiness.product.name, { exact: true })).toBeVisible();
  });
});
