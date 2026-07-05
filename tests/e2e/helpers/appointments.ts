import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { E2ECheckoutBusiness } from "./api";
import { uniqueE2EEmail } from "./env";
import { waitForApiCondition } from "./authed-api";
import { gotoStorefront } from "./navigation";
import { listOwnerBusinesses } from "./owner-business";
import { pageApiJson } from "./page-api";

type StorefrontResponse = {
  business: { id: number; slug: string; name: string; storefrontMode?: string | null };
  products: E2ECheckoutBusiness["product"][];
};

export type AppointmentRequest = {
  id: number;
  businessId: number;
  customerName: string;
  status: string;
};

export function tomorrowIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function submitAppointmentRequestViaUi(
  page: Page,
  business: E2ECheckoutBusiness,
  customerName: string,
): Promise<number> {
  await gotoStorefront(page, business.slug);
  await page.getByTestId("button-book-appointment").click();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/appointment-requests") &&
      response.request().method() === "POST" &&
      response.ok(),
  );

  await page.locator("#appt-name").fill(customerName);
  await page.locator("#appt-email").fill(uniqueE2EEmail("e2e-appt"));
  await page.locator("#appt-phone").fill("555-010-7788");
  await page.locator("#appt-date").fill(tomorrowIsoDate());
  await page.getByTestId("input-appt-time").fill("14:00");
  await page.getByRole("button", { name: /submit request/i }).click();

  await expect(page.getByText(/request submitted/i)).toBeVisible();

  const response = await responsePromise;
  const body = (await response.json()) as AppointmentRequest;
  return body.id;
}

export async function listBusinessAppointments(
  page: Page,
  businessId: number,
): Promise<AppointmentRequest[]> {
  const { ok, status, data } = await pageApiJson<AppointmentRequest[]>(
    page,
    `/api/businesses/${businessId}/appointment-requests`,
  );
  if (!ok) {
    throw new Error(`Failed to list appointments: ${status}`);
  }
  return data;
}

export async function waitForAppointmentStatus(
  page: Page,
  businessId: number,
  appointmentId: number,
  status: string,
): Promise<void> {
  await waitForApiCondition(
    async () => {
      const requests = await listBusinessAppointments(page, businessId);
      const match = requests.find((request) => request.id === appointmentId);
      return match?.status === status;
    },
    { label: `appointment ${appointmentId} status ${status}` },
  );
}

export async function findOwnerAppointmentBusiness(
  page: Page,
): Promise<E2ECheckoutBusiness & { storefrontMode: string }> {
  const owned = await listOwnerBusinesses(page);

  for (const business of owned) {
    const { ok, data } = await pageApiJson<StorefrontResponse>(page, `/api/businesses/${business.slug}`);
    if (!ok) continue;

    const mode = data.business.storefrontMode ?? "ORDERING";
    if (mode !== "APPOINTMENT") continue;

    const product = data.products.find(
      (item) => item.available && (item.optionGroups?.length ?? 0) === 0,
    );
    if (!product) continue;

    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      product,
      taxEnabled: false,
      taxRatePercent: null,
      storefrontMode: mode,
    };
  }

  throw new Error(
    "No appointment-mode business owned by the test owner. Set one owned business to Appointments storefront mode.",
  );
}
