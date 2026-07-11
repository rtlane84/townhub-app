import type { Page } from "@playwright/test";
import type { E2ECheckoutBusiness } from "./api";
import { uniqueE2EEmail } from "./env";

export async function addFirstProductToCart(page: Page, business: E2ECheckoutBusiness): Promise<void> {
  await page.getByText(business.product.name, { exact: true }).waitFor({ state: "visible" });

  const addButton = page.getByRole("button", { name: /^add$/i });
  await addButton.first().click();
}

export async function openCartFromStorefront(page: Page): Promise<void> {
  await page.getByRole("link", { name: /cart/i }).click();
}

export type GuestCheckoutDetails = {
  name?: string;
  email?: string;
  phone?: string;
};

export async function fillGuestCheckoutForm(
  page: Page,
  details: GuestCheckoutDetails = {},
): Promise<GuestCheckoutDetails> {
  const filled = {
    name: details.name ?? "E2E Guest Customer",
    email: details.email ?? uniqueE2EEmail(),
    phone: details.phone ?? "555-010-1234",
  };

  await page.locator("#name").fill(filled.name);
  await page.locator("#phone").fill(filled.phone);
  await page.locator("#email").fill(filled.email);

  return filled;
}

export async function submitPayAtPickupCheckout(page: Page): Promise<void> {
  const payAtPickupButton = page.getByRole("button", { name: /pay at pickup/i });
  await payAtPickupButton.waitFor({ state: "visible" });
  await payAtPickupButton.click();
}
