import { adminTest as test, expect } from "../fixtures/auth.fixture";
import {
  ADMIN_AUTH_SKIP_REASON,
  APPLICANT_AUTH_SKIP_REASON,
  APPLICANT_PENDING_SKIP_REASON,
  adminAuthStatePath,
  applicantAuthStatePath,
  hasAdminAuthState,
  hasApplicantAuthState,
} from "../helpers/auth";
import { createAuthedApiContext } from "../helpers/authed-api";
import { findApprovedApplicationByName, findPendingApplicationByName, rejectAllPendingApplications, submitApplicationViaApi } from "../helpers/applications";
import { ApplicantPendingApplicationError } from "../helpers/list-your-business";
import { uniqueE2ELabel } from "../helpers/env";
import { hydrateAuthedPage } from "../helpers/page-api";
import { selectOwnedBusinessByName } from "../helpers/owner-business";

test.describe("Admin approval workflow", () => {
  test.beforeEach(async ({ browser }) => {
    test.skip(!hasAdminAuthState(), ADMIN_AUTH_SKIP_REASON);
    test.skip(!hasApplicantAuthState(), APPLICANT_AUTH_SKIP_REASON);

    const adminContext = await createAuthedApiContext(browser, adminAuthStatePath());
    const adminPage = await adminContext.newPage();
    try {
      await hydrateAuthedPage(adminPage, "/dashboard/admin/applications");
      await rejectAllPendingApplications(adminPage);
    } finally {
      await adminPage.close();
      await adminContext.close();
    }
  });

  test("admin approves a pending application and applicant gains Business Hub access", async ({
    page,
    browser,
  }) => {
    const businessName = uniqueE2ELabel("E2E Approved Shop");
    const applicantContext = await createAuthedApiContext(browser, applicantAuthStatePath());
    const applicantPage = await applicantContext.newPage();

    try {
      try {
        await submitApplicationViaApi(applicantPage, { name: businessName });
      } catch (error) {
        if (error instanceof ApplicantPendingApplicationError) {
          test.skip(true, APPLICANT_PENDING_SKIP_REASON);
        }
        throw error;
      }

      await hydrateAuthedPage(page, "/dashboard/admin/applications");
      await expect
        .poll(async () => findPendingApplicationByName(page, businessName))
        .toBeTruthy();

      const applicationCard = page.locator("div.space-y-4 > div").filter({ hasText: businessName });
      await expect(applicationCard.getByText("Pending")).toBeVisible();
      await applicationCard.getByRole("button", { name: /^approve$/i }).click();
      await page.getByRole("button", { name: /approve & create business/i }).click();

      await expect(page.getByText(/application approved/i).first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => findApprovedApplicationByName(page, businessName), {
          message: "application should be approved with a created business",
        })
        .toBeTruthy();

      await hydrateAuthedPage(applicantPage, "/dashboard/business");
      await expect(applicantPage).toHaveURL(/\/dashboard\/business/);
      await expect(applicantPage.getByTestId("stat-today-orders")).toBeVisible();
      await selectOwnedBusinessByName(applicantPage, businessName);
    } finally {
      await applicantPage.close();
      await applicantContext.close();
    }
  });
});
