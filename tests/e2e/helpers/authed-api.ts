import type { APIResponse, Browser, BrowserContext } from "@playwright/test";
import { e2eBaseUrl } from "./env";

export async function createAuthedApiContext(
  browser: Browser,
  storageStatePath: string,
): Promise<BrowserContext> {
  return browser.newContext({
    storageState: storageStatePath,
    baseURL: e2eBaseUrl(),
  });
}

export async function apiFetch(
  context: BrowserContext,
  path: string,
  init?: Parameters<BrowserContext["request"]["fetch"]>[1],
): Promise<APIResponse> {
  return context.request.fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
}

export async function apiJson<T>(
  context: BrowserContext,
  path: string,
  init?: Parameters<BrowserContext["request"]["fetch"]>[1],
): Promise<{ response: APIResponse; data: T }> {
  const response = await apiFetch(context, path, init);
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  return { response, data };
}

export async function waitForApiCondition(
  fn: () => Promise<boolean>,
  options?: { timeoutMs?: number; intervalMs?: number; label?: string },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      if (await fn()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for ${options?.label ?? "condition"} after ${timeoutMs}ms` +
      (lastError ? `: ${String(lastError)}` : ""),
  );
}
