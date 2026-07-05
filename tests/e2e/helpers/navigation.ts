import type { Page } from "@playwright/test";

export async function gotoHome(page: Page): Promise<void> {
  await page.goto("/");
}

export async function gotoBusinesses(page: Page): Promise<void> {
  await page.goto("/businesses");
}

export async function gotoStorefront(page: Page, slug: string): Promise<void> {
  await page.goto(`/businesses/${slug}`);
}

export async function gotoCart(page: Page): Promise<void> {
  await page.goto("/cart");
}

export async function gotoOrderConfirmation(
  page: Page,
  orderId: number,
  accessToken: string,
): Promise<void> {
  await page.goto(`/order/${orderId}?token=${encodeURIComponent(accessToken)}`);
}

export async function gotoOwnerDashboard(page: Page, path = "/dashboard/business"): Promise<void> {
  await page.goto(path);
}

export async function gotoAdminDashboard(page: Page, path = "/dashboard/admin/system-status"): Promise<void> {
  await page.goto(path);
}
