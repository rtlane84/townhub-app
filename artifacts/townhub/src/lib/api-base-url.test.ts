import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure helpers mirrored for unit testing without Vite import.meta.env.
 * Keep in sync with api-base-url.ts resolve logic.
 */
function resolveApiUrlWithBase(baseRaw: string | undefined, path: string): string {
  const base = (baseRaw ?? "").trim().replace(/\/+$/, "");
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

describe("api-base-url resolve logic", () => {
  it("keeps relative paths when base is empty", () => {
    assert.equal(resolveApiUrlWithBase("", "/api/businesses"), "/api/businesses");
    assert.equal(resolveApiUrlWithBase(undefined, "/api/businesses"), "/api/businesses");
  });

  it("prefixes absolute API origin and strips trailing slash", () => {
    assert.equal(
      resolveApiUrlWithBase("https://town-hub-production.up.railway.app/", "/api/businesses"),
      "https://town-hub-production.up.railway.app/api/businesses",
    );
  });

  it("leaves already-absolute URLs unchanged", () => {
    assert.equal(
      resolveApiUrlWithBase("https://api.example.com", "https://other.example/api/x"),
      "https://other.example/api/x",
    );
  });
});
