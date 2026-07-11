import { ownerTest as test, expect } from "../fixtures/auth.fixture";
import {
  hasOwnerAuthState,
  OWNER_AUTH_SKIP_REASON,
} from "../helpers/auth";
import { gotoOwnerDashboard } from "../helpers/navigation";

test.describe("Business owner dashboard", () => {
  test.beforeEach(() => {
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);
  });

  test("Business Hub loads for authenticated owner", async ({ page }) => {
    await gotoOwnerDashboard(page, "/dashboard/business");
    await expect(page).toHaveURL(/\/dashboard\/business/);
    await expect(page.getByTestId("stat-today-orders")).toBeVisible();
  });

  test("owner can view orders page", async ({ page }) => {
    await gotoOwnerDashboard(page, "/dashboard/business/orders");
    await expect(page).toHaveURL(/\/dashboard\/business\/orders/);
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
  });

  test("owner can view items page", async ({ page }) => {
    await gotoOwnerDashboard(page, "/dashboard/business/products");
    await expect(page).toHaveURL(/\/dashboard\/business\/products/);
    await expect(page.getByTestId("button-add-product")).toBeVisible();
  });

  test("owner can view settings page", async ({ page }) => {
    await gotoOwnerDashboard(page, "/dashboard/business/settings");
    await expect(page).toHaveURL(/\/dashboard\/business\/settings/);
    await expect(page.getByTestId("button-save-settings")).toBeVisible();
  });
});
