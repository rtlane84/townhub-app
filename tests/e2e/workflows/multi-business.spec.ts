import { ownerTest as test, expect } from "../fixtures/auth.fixture";
import { OWNER_AUTH_SKIP_REASON, hasOwnerAuthState } from "../helpers/auth";
import { listOwnerBusinesses } from "../helpers/owner-business";
import { gotoOwnerDashboard } from "../helpers/navigation";

const SELECTED_BUSINESS_STORAGE_KEY = "local-order-hub:selected-business-id";

async function selectBusinessInDashboard(page: import("@playwright/test").Page, businessId: number): Promise<void> {
  await page.evaluate(
    ({ key, id }) => {
      localStorage.setItem(key, String(id));
    },
    { key: SELECTED_BUSINESS_STORAGE_KEY, id: businessId },
  );
  await gotoOwnerDashboard(page, "/dashboard/business");
}

test.describe("Multi-business switching workflow", () => {
  test.beforeEach(() => {
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);
  });

  test("switching businesses updates dashboard context", async ({ page }) => {
    const businesses = await listOwnerBusinesses(page);
    test.skip(businesses.length < 2, "Owner account needs at least two businesses for switcher test.");

    const [first, second] = businesses;

    await selectBusinessInDashboard(page, first.id);
    await expect(page.getByText(`${first.name} at a glance`)).toBeVisible();

    await selectBusinessInDashboard(page, second.id);
    await expect(page.getByText(`${second.name} at a glance`)).toBeVisible();

    await page.getByTestId("button-business-switcher").click();
    await expect(page.getByRole("menuitem", { name: second.name })).toBeVisible();
  });
});
