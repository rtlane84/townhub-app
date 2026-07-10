/**
 * Absolute API origin for split deploys (Netlify frontend + Railway API).
 * Leave unset in local Vite dev — `/api` is proxied to localhost:8080.
 *
 * Example: https://town-hub-production.up.railway.app
 *
 * Keep this module free of `@workspace/api-client-react` so Node unit tests
 * that import resolveApiUrl do not load the generated client package.
 */
export function getApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const raw = env?.VITE_API_BASE_URL;
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

/** Resolve a relative `/api/...` path against the configured API base URL. */
export function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
