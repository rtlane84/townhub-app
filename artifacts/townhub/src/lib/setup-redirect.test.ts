import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSetupRedirectPath } from "./setup-redirect.ts";

describe("setup-redirect", () => {
  it("returns null while bootstrap is still available", () => {
    assert.equal(resolveSetupRedirectPath(false, undefined), null);
    assert.equal(resolveSetupRedirectPath(false, "ADMIN"), null);
  });

  it("redirects admins to the admin dashboard after setup", () => {
    assert.equal(resolveSetupRedirectPath(true, "ADMIN"), "/dashboard/admin");
  });

  it("redirects everyone else home after setup", () => {
    assert.equal(resolveSetupRedirectPath(true, undefined), "/");
    assert.equal(resolveSetupRedirectPath(true, "CUSTOMER"), "/");
    assert.equal(resolveSetupRedirectPath(true, "BUSINESS_OWNER"), "/");
  });
});

describe("setup page redirect wiring", () => {
  it("uses bootstrap status and redirect helper", async () => {
    const setupSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../pages/setup.tsx", import.meta.url), "utf8"),
    );
    assert.match(setupSource, /useGetAdminBootstrapStatus/);
    assert.match(setupSource, /resolveSetupRedirectPath/);
  });

  it("hides setup navigation after bootstrap completes", async () => {
    const layoutSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../components/layout.tsx", import.meta.url), "utf8"),
    );
    assert.match(layoutSource, /useGetAdminBootstrapStatus/);
    assert.match(layoutSource, /setupAvailable/);
  });
});
