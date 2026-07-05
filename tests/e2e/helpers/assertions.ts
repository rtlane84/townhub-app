import { expect, type Page } from "@playwright/test";
import type { E2ECheckoutBusiness } from "./api";

export async function expectCheckoutTotalsVisible(page: Page): Promise<void> {
  await expect(page.getByText("Subtotal", { exact: true })).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
}

export async function expectCartContainsProduct(
  page: Page,
  business: E2ECheckoutBusiness,
): Promise<void> {
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(page.getByText(business.product.name, { exact: true }).first()).toBeVisible();
  await expectCheckoutTotalsVisible(page);
}

export async function expectOrderConfirmationWithToken(page: Page): Promise<{
  orderId: number;
  token: string;
}> {
  await expect(page.getByRole("heading", { name: "Order Received!" })).toBeVisible({ timeout: 20_000 });

  const url = new URL(page.url());
  expect(url.pathname).toMatch(/^\/order\/\d+$/);

  const orderId = Number(url.pathname.split("/").pop());
  const token = url.searchParams.get("token");

  expect(orderId).toBeGreaterThan(0);
  expect(token).toBeTruthy();

  return { orderId, token: token! };
}

export async function expectPageHeading(page: Page, heading: string | RegExp): Promise<void> {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}
