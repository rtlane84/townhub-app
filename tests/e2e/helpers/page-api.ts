import type { Page } from "@playwright/test";

export type PageApiResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

export async function waitForClerkSession(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const clerk = (window as unknown as {
        Clerk?: { loaded?: boolean; session?: { id?: string } };
      }).Clerk;
      return clerk?.loaded === true && !!clerk.session?.id;
    },
    { timeout: 30_000 },
  );
}

export async function hydrateAuthedPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForClerkSession(page);
}

async function ensureAppPage(page: Page): Promise<void> {
  let url = page.url();
  if (!url.includes("localhost:23032") && !url.includes("127.0.0.1:23032")) {
    await page.goto("/");
    url = page.url();
  }
  if (url.includes("/dashboard") || url.includes("/list-your-business")) {
    await waitForClerkSession(page);
  }
}

export async function pageApiJson<T>(
  page: Page,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<PageApiResult<T>> {
  await ensureAppPage(page);

  const token = await page.evaluate(async () => {
    const clerk = (window as unknown as {
      Clerk?: { session?: { getToken: () => Promise<string | null> } };
    }).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  });

  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await page.evaluate(
      async ({ path: apiPath, init: requestInit, authToken }) => {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (requestInit?.body) {
          headers["Content-Type"] = "application/json";
        }
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(apiPath, {
          method: requestInit?.method ?? "GET",
          headers,
          body: requestInit?.body ? JSON.stringify(requestInit.body) : undefined,
          credentials: "include",
        });

        const text = await response.text();
        let data = {} as T;
        if (text) {
          data = JSON.parse(text) as T;
        }

        return { ok: response.ok, status: response.status, data };
      },
      { path, init, authToken: token },
    );

    if (result.status !== 429 || attempt === maxAttempts) {
      return result;
    }

    await page.waitForTimeout(Math.min(10_000, 1_000 * 2 ** (attempt - 1)));
  }

  throw new Error(`pageApiJson exhausted retries for ${path}`);
}
