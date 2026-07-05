import { applicantTest as test, expect } from "../fixtures/auth.fixture";
import {
  APPLICANT_AUTH_SKIP_REASON,
  APPLICANT_PENDING_SKIP_REASON,
  ADMIN_AUTH_SKIP_REASON,
  adminAuthStatePath,
  hasAdminAuthState,
  hasApplicantAuthState,
} from "../helpers/auth";
import { completeListYourBusinessApplication, ApplicantPendingApplicationError } from "../helpers/list-your-business";
import { uniqueE2ELabel } from "../helpers/env";
import { findPendingApplicationByName, rejectAllPendingApplications } from "../helpers/applications";
import { createAuthedApiContext } from "../helpers/authed-api";
import { hydrateAuthedPage } from "../helpers/page-api";

test.describe("Business application workflow", () => {
  test.beforeEach(async ({ browser }) => {
    test.skip(!hasApplicantAuthState(), APPLICANT_AUTH_SKIP_REASON);
    test.skip(!hasAdminAuthState(), ADMIN_AUTH_SKIP_REASON);

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

  test("applicant can submit a business listing application", async ({ page, browser }) => {
    const businessName = uniqueE2ELabel("E2E Bakery");
    const adminContext = await createAuthedApiContext(browser, adminAuthStatePath());
    const adminPage = await adminContext.newPage();

    try {
      await completeListYourBusinessApplication(page, { name: businessName });
    } catch (error) {
      if (error instanceof ApplicantPendingApplicationError) {
        test.skip(true, APPLICANT_PENDING_SKIP_REASON);
      }
      throw error;
    }

    try {
      await expect(page.getByText(/what happens next/i)).toBeVisible();

      await hydrateAuthedPage(adminPage, "/dashboard/admin/system-status");
      await expect
        .poll(async () => findPendingApplicationByName(adminPage, businessName), {
          message: "pending application should appear in admin API",
        })
        .toBeTruthy();
    } finally {
      await adminPage.close();
      await adminContext.close();
    }
  });
});
