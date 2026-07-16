import type { Page } from "@playwright/test";
import { e2eApiUrl, e2eBaseUrl } from "./env";

export type PageApiResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

function resolvePageApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const apiBase = e2eApiUrl().replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${normalized}`;
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().slice(0, 32).toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

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
  const baseHost = new URL(e2eBaseUrl()).host;
  let onAppHost = false;
  try {
    onAppHost = new URL(url).host === baseHost;
  } catch {
    onAppHost = false;
  }
  if (!onAppHost) {
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

  const requestUrl = resolvePageApiUrl(path);
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await page.evaluate(
      async ({ requestUrl: apiUrl, init: requestInit, authToken }) => {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (requestInit?.body) {
          headers["Content-Type"] = "application/json";
        }
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(apiUrl, {
          method: requestInit?.method ?? "GET",
          headers,
          body: requestInit?.body ? JSON.stringify(requestInit.body) : undefined,
          credentials: "include",
        });

        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          text,
          contentType: response.headers.get("content-type"),
        };
      },
      { requestUrl, init, authToken: token },
    );

    if (result.status === 429 && attempt < maxAttempts) {
      await page.waitForTimeout(Math.min(10_000, 1_000 * 2 ** (attempt - 1)));
      continue;
    }

    if (result.text && looksLikeHtml(result.text)) {
      throw new Error(
        `Expected JSON from ${requestUrl} but got HTML (${result.status}, ` +
          `${result.contentType ?? "no content-type"}). ` +
          `Set E2E_API_URL to the API host (e.g. https://api-staging.townhub.io), not the SPA.`,
      );
    }

    let data = {} as T;
    if (result.text) {
      try {
        data = JSON.parse(result.text) as T;
      } catch (cause) {
        const preview = result.text.trim().slice(0, 120);
        throw new Error(
          `Failed to parse JSON from ${requestUrl} (${result.status}): ${preview}`,
          { cause },
        );
      }
    }

    return { ok: result.ok, status: result.status, data };
  }

  throw new Error(`pageApiJson exhausted retries for ${requestUrl}`);
}
