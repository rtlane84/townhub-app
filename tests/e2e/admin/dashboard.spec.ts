import { adminTest as test, expect } from "../fixtures/auth.fixture";
import {
  hasAdminAuthState,
  ADMIN_AUTH_SKIP_REASON,
} from "../helpers/auth";
import { gotoAdminDashboard } from "../helpers/navigation";

test.describe("Admin dashboard", () => {
  test.beforeEach(() => {
    test.skip(!hasAdminAuthState(), ADMIN_AUTH_SKIP_REASON);
  });

  test("admin system status page loads", async ({ page }) => {
    await gotoAdminDashboard(page, "/dashboard/admin/system-status");
    await expect(page).toHaveURL(/\/dashboard\/admin\/system-status/);
    await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible();
  });

  test("admin applications page loads", async ({ page }) => {
    await gotoAdminDashboard(page, "/dashboard/admin/applications");
    await expect(page).toHaveURL(/\/dashboard\/admin\/applications/);
    await expect(page.getByRole("heading", { name: "Business Applications" })).toBeVisible();
  });
});
