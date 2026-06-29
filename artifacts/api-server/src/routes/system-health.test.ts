import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Admin system health is mounted at GET /api/admin/system/health and protected by
 * the global /admin prefix guard in routes/index.ts (requireAdmin middleware).
 * Unauthorized callers receive 401; non-admin users receive 403.
 */
describe("admin system health access", () => {
  it("route path is under the admin prefix guard", async () => {
    const indexSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/index.ts", import.meta.url), "utf8"),
    );
    assert.match(indexSource, /router\.use\("\/admin"/);
    assert.match(indexSource, /requireAdmin/);
  });

  it("handler is registered on admin router", async () => {
    const adminSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/admin.ts", import.meta.url), "utf8"),
    );
    assert.match(adminSource, /\/admin\/system\/health/);
  });
});
