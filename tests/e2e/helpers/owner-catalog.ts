import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function createCategoryViaUi(
  page: Page,
  name: string,
  sortOrder = "0",
): Promise<void> {
  await page.goto("/dashboard/business/categories");
  await page.getByTestId("button-add-category").click();
  await page.getByTestId("input-category-name").fill(name);
  await page.getByTestId("input-category-sort-order").fill(sortOrder);
  await page.getByTestId("button-save-category").click();
  await expect(page.getByTestId(/row-category-/).filter({ hasText: name })).toBeVisible();
}

export async function createProductViaUi(
  page: Page,
  input: { name: string; price: string; categoryName?: string },
): Promise<void> {
  await page.goto("/dashboard/business/products");
  await page.getByTestId("button-add-product").click();
  await page.getByTestId("input-product-name").fill(input.name);
  await page.getByTestId("input-product-price").fill(input.price);

  if (input.categoryName) {
    await page.getByTestId("select-product-category").click();
    await page.getByRole("option", { name: input.categoryName }).click();
  }

  await page.getByTestId("button-save-product").click();
  await expect(page.getByTestId(/row-product-/).filter({ hasText: input.name })).toBeVisible();
}
