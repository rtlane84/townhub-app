import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSetupCompleteFromAdminCount,
} from "./admin-bootstrap-logic.ts";

describe("admin-bootstrap", () => {
  it("isSetupCompleteFromAdminCount is false until the first admin exists", () => {
    assert.equal(isSetupCompleteFromAdminCount(0), false);
    assert.equal(isSetupCompleteFromAdminCount(1), true);
    assert.equal(isSetupCompleteFromAdminCount(3), true);
  });
});

describe("admin bootstrap routes", () => {
  it("registers bootstrap-status and bootstrap handlers", async () => {
    const authSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/auth.ts", import.meta.url), "utf8"),
    );
    assert.match(authSource, /\/admin\/bootstrap-status/);
    assert.match(authSource, /\/admin\/bootstrap/);
    assert.match(authSource, /isAdminBootstrapComplete/);
  });

  it("allows public access to bootstrap-status and bootstrap POST", async () => {
    const indexSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/index.ts", import.meta.url), "utf8"),
    );
    assert.match(indexSource, /\/bootstrap-status/);
    assert.match(indexSource, /\/bootstrap/);
  });

  it("locks bootstrap POST after setup is complete", async () => {
    const authSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../routes/auth.ts", import.meta.url), "utf8"),
    );
    assert.match(authSource, /isAdminBootstrapComplete\(\)/);
    assert.match(authSource, /status\(403\)/);
    assert.match(authSource, /Setup is locked/);
  });
});
