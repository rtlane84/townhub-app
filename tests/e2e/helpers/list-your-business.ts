import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ApplicantPendingApplicationError } from "./auth";
import { waitForClerkSession } from "./page-api";

export type ListYourBusinessApplicationInput = {
  name: string;
  typeLabel?: string;
};

export { ApplicantPendingApplicationError } from "./auth";

function resolveApplicationName(input: { name?: string; businessName?: string }): string {
  const name = input.name?.trim() || input.businessName?.trim();
  if (!name) {
    throw new Error(
      "completeListYourBusinessApplication requires input.name (business name string).",
    );
  }
  return name;
}

export async function waitForSlugAvailabilityReady(page: Page): Promise<void> {
  await expect(
    page.getByText(/URL available|URL already taken/i),
  ).toBeVisible({ timeout: 15_000 });
}

export async function ensureApplicantCanApply(page: Page): Promise<void> {
  await page.goto("/list-your-business");
  await page.waitForLoadState("domcontentloaded");
  await waitForClerkSession(page);

  const formHeading = page.getByRole("heading", { name: /list your business|add another business/i });
  const pendingHeading = page.getByRole("heading", { name: "Application under review" });

  await expect(formHeading.or(pendingHeading)).toBeVisible({ timeout: 30_000 });

  if (await pendingHeading.isVisible()) {
    throw new ApplicantPendingApplicationError();
  }
}

async function waitForReviewStepReady(page: Page): Promise<void> {
  await expect(page.getByText("Review and submit")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 20_000 });
}

export async function completeListYourBusinessApplication(
  page: Page,
  input: ListYourBusinessApplicationInput,
): Promise<void> {
  const name = resolveApplicationName(input);

  await ensureApplicantCanApply(page);

  await page.locator("#name").fill(name);
  await page.locator("#type").click();
  await page.getByRole("option", { name: input.typeLabel ?? "Restaurant" }).click();
  await waitForSlugAvailabilityReady(page);

  await page.getByRole("button", { name: /continue to contact info/i }).click();
  await page.getByRole("button", { name: /continue to review|skip contact details/i }).first().click();
  await waitForReviewStepReady(page);

  await expect(async () => {
    const submitButton = page.getByRole("button", { name: /submit application/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }).toPass({ timeout: 30_000 });

  await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(name)).toBeVisible();
}
