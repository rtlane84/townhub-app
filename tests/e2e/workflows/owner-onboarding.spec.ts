import { ownerTest as test, expect } from "../fixtures/auth.fixture";
import { OWNER_AUTH_SKIP_REASON, hasOwnerAuthState } from "../helpers/auth";
import { createCategoryViaUi, createProductViaUi } from "../helpers/owner-catalog";
import { getOwnerSelectedBusinessSlug } from "../helpers/owner-business";
import { gotoStorefront } from "../helpers/navigation";
import { uniqueE2ELabel } from "../helpers/env";

test.describe("Owner onboarding workflow", () => {
  test.beforeEach(() => {
    test.skip(!hasOwnerAuthState(), OWNER_AUTH_SKIP_REASON);
  });

  test("owner can add catalog items and publish them on the storefront", async ({ page }) => {
    const categoryName = uniqueE2ELabel("E2E Category");
    const productName = uniqueE2ELabel("E2E Item");
    const slug = await getOwnerSelectedBusinessSlug(page);

    await createCategoryViaUi(page, categoryName);
    await createProductViaUi(page, {
      name: productName,
      price: "9.99",
      categoryName,
    });

    await gotoStorefront(page, slug);
    await expect(page.getByText(productName, { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});
