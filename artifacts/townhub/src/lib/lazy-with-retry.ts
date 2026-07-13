import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RETRY_SESSION_KEY = "townhub.lazy-chunk-retry";

export function isDynamicImportFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("is not a valid javascript mime type") ||
    message.includes("expected a javascript-or-wasm module script") ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk")
  );
}

/**
 * Like React.lazy, but recovers once from stale deploy/chunk MIME failures
 * by reloading the page (common after Worker deploys and native WebView cache).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RETRY_SESSION_KEY);
      return mod;
    } catch (error) {
      const alreadyRetried = sessionStorage.getItem(RETRY_SESSION_KEY) === "1";
      if (!alreadyRetried && isDynamicImportFailure(error)) {
        sessionStorage.setItem(RETRY_SESSION_KEY, "1");
        window.location.reload();
        return new Promise(() => {
          /* wait for reload */
        });
      }
      sessionStorage.removeItem(RETRY_SESSION_KEY);
      throw error;
    }
  });
}
