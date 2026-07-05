import { test as base, expect } from "@playwright/test";
import { findCheckoutBusiness, type E2ECheckoutBusiness } from "../helpers/api";

type E2EFixtures = {
  checkoutBusiness: E2ECheckoutBusiness;
};

export const test = base.extend<E2EFixtures>({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      localStorage.removeItem("local-order-hub-cart");
    });
    await use(context);
  },
  checkoutBusiness: async ({}, use) => {
    const business = await findCheckoutBusiness();
    await use(business);
  },
});

export { expect };
