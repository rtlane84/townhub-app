import { test as base, expect, type Browser, type BrowserContext } from "@playwright/test";
import { adminAuthStatePath, hasAdminAuthState, ownerAuthStatePath, hasOwnerAuthState } from "../helpers/auth";

async function contextWithOptionalStorageState(
  browser: Browser,
  storageStatePath: string,
  hasStorageState: () => boolean,
): Promise<BrowserContext> {
  if (!hasStorageState()) {
    return browser.newContext();
  }
  return browser.newContext({ storageState: storageStatePath });
}

export const ownerTest = base.extend<{ ownerContext: BrowserContext }>({
  ownerContext: async ({ browser }, use) => {
    const context = await contextWithOptionalStorageState(browser, ownerAuthStatePath(), hasOwnerAuthState);
    await use(context);
    await context.close();
  },
  page: async ({ ownerContext }, use) => {
    const page = await ownerContext.newPage();
    await use(page);
    await page.close();
  },
});

export const adminTest = base.extend<{ adminContext: BrowserContext }>({
  adminContext: async ({ browser }, use) => {
    const context = await contextWithOptionalStorageState(browser, adminAuthStatePath(), hasAdminAuthState);
    await use(context);
    await context.close();
  },
  page: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };
