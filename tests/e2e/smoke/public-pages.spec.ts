import { test, expect } from "../fixtures/test.fixture";
import { gotoBusinesses, gotoHome, gotoStorefront } from "../helpers/navigation";
import { expectPageHeading } from "../helpers/assertions";

test.describe("Public pages smoke", () => {
  test("homepage loads", async ({ page }) => {
    await gotoHome(page);
    await expect(page).toHaveTitle(/TownHaven|Local/i);
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
    await expect(page.getByRole("heading", { name: /let customers know where to find you today/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /map showing where mobile businesses are today/i })).toBeVisible();
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

  test("Business Basic storefront fails closed to display-only actions", async ({ page }) => {
    await page.route("**/api/businesses/basic-display-only", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          business: {
            id: 99_001,
            name: "Basic Display Only",
            slug: "basic-display-only",
            type: "SALON",
            description: "A listing-only salon.",
            address: "100 Main Street, Clay, WV 25043",
            phone: "304-555-0199",
            websiteUrl: "https://example.com",
            active: true,
            storefrontMode: "APPOINTMENT",
            onlineOrderingEntitled: false,
            appointmentRequestsEntitled: false,
            businessWebsiteEntitled: false,
          },
          categories: [{ id: 1, businessId: 99_001, name: "Services" }],
          products: [{
            id: 1,
            businessId: 99_001,
            categoryId: 1,
            name: "Hidden Service",
            price: 25,
            available: true,
          }],
        }),
      });
    });

    await gotoStorefront(page, "basic-display-only");

    await expect(page.getByRole("heading", { name: "Basic Display Only" })).toBeVisible();
    await expect(page.getByText("Contact this business directly for more information.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Call" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Website" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(page.getByRole("button", { name: /order now|book now|call to order/i })).toHaveCount(0);
    await expect(page.getByText("Hidden Service", { exact: true })).toHaveCount(0);
  });
});
