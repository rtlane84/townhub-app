import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { gotoOwnerDashboard } from "./navigation";
import { pageApiJson } from "./page-api";

export type OwnerBusinessSummary = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
};

export async function listOwnerBusinesses(page: Page): Promise<OwnerBusinessSummary[]> {
  await gotoOwnerDashboard(page, "/dashboard/business");
  await page.getByTestId("stat-today-orders").waitFor({ state: "visible", timeout: 30_000 });
  const { ok, status, data } = await pageApiJson<OwnerBusinessSummary[]>(page, "/api/auth/me/businesses");
  if (!ok) {
    throw new Error(`Failed to list owner businesses: ${status}`);
  }
  return data;
}

export async function selectOwnedBusinessByName(page: Page, businessName: string): Promise<void> {
  await expect
    .poll(async () => {
      const { ok, data } = await pageApiJson<OwnerBusinessSummary[]>(page, "/api/auth/me/businesses");
      if (!ok) {
        return false;
      }
      return data.some((business) => business.name === businessName);
    }, { message: `owned businesses should include ${businessName}` })
    .toBe(true);

  await page.getByTestId("button-business-switcher").click();
  await page.getByRole("menuitem", { name: new RegExp(businessName, "i") }).click();
  await expect(page.getByText(new RegExp(`${businessName} at a glance`, "i"))).toBeVisible({
    timeout: 15_000,
  });
}

export async function getOwnerSelectedBusinessSlug(page: Page): Promise<string> {
  await gotoOwnerDashboard(page, "/dashboard/business/settings");
  const fullUrl = await page.getByTestId("input-storefront-url").inputValue();
  const slug = new URL(fullUrl).pathname.split("/").filter(Boolean).pop();
  if (!slug) {
    throw new Error("Could not parse storefront slug from settings");
  }
  return slug;
}
