import { test, expect } from "../fixtures/test.fixture";
import {
  OWNER_AUTH_SKIP_REASON,
  hasOwnerAuthState,
  ownerAuthStatePath,
} from "../helpers/auth";
import {
  findOwnerAppointmentBusiness,
  submitAppointmentRequestViaUi,
  waitForAppointmentStatus,
} from "../helpers/appointments";
import { gotoOwnerDashboard } from "../helpers/navigation";
import { uniqueE2ELabel } from "../helpers/env";
import { createAuthedApiContext } from "../helpers/authed-api";

test.describe("Appointment workflow", () => {
  test("customer request is confirmed by owner", async ({ page, browser }) => {
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);

    const ownerContext = await createAuthedApiContext(browser, ownerAuthStatePath());
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto("/dashboard/business");
    await ownerPage.getByTestId("stat-today-orders").waitFor({ state: "visible", timeout: 30_000 });
    const appointmentBusiness = await findOwnerAppointmentBusiness(ownerPage).catch((error: Error) => {
      test.skip(true, error.message);
      return null as never;
    });
    const customerName = uniqueE2ELabel("E2E Appt Customer");

    try {
      const appointmentId = await submitAppointmentRequestViaUi(page, appointmentBusiness, customerName);

      await gotoOwnerDashboard(ownerPage, "/dashboard/business/appointments");
      const requestRow = ownerPage.getByTestId(`appointment-request-${appointmentId}`);
      await expect(requestRow).toBeVisible({ timeout: 30_000 });
      await expect(requestRow.getByText(customerName)).toBeVisible();

      await ownerPage.getByTestId(`confirm-appointment-${appointmentId}`).click();
      await ownerPage.getByRole("button", { name: /confirm appointment/i }).click();

      await waitForAppointmentStatus(ownerPage, appointmentBusiness.id, appointmentId, "CONFIRMED");
      await expect(requestRow.getByText(/confirmed/i)).toBeVisible();
    } finally {
      await ownerPage.close();
      await ownerContext.close();
    }
  });
});
