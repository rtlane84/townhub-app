import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  isUserActive,
  respondIfUserDisabled,
  USER_DISABLED_MESSAGE,
} from "./user-account-status.ts";

describe("user-account-status", () => {
  it("treats only DISABLED as inactive", () => {
    assert.equal(isUserActive("ACTIVE"), true);
    assert.equal(isUserActive("DISABLED"), false);
    assert.equal(isUserActive(undefined), true);
  });

  it("responds with 403 for disabled users", () => {
    const calls: Array<{ status: number; body: unknown }> = [];
    const res = {
      status(code: number) {
        return {
          json(body: unknown) {
            calls.push({ status: code, body });
          },
        };
      },
    };

    const blocked = respondIfUserDisabled("DISABLED", res as never);
    assert.equal(blocked, true);
    assert.deepEqual(calls, [{ status: 403, body: { error: USER_DISABLED_MESSAGE } }]);
  });
});

describe("admin user management routes", () => {
  it("registers status updates and safeguard helpers", async () => {
    const source = await readFile(new URL("../routes/admin.ts", import.meta.url), "utf8");
    assert.match(source, /\/admin\/users\/:id\/status/);
    assert.match(source, /validateRoleChange/);
    assert.match(source, /validateUserStatusChange/);
    assert.match(source, /countActiveAdmins/);
    assert.doesNotMatch(source, /\.delete\(/);
  });

  it("blocks disabled users in authenticated middleware", async () => {
    const requireAuthSource = await readFile(
      new URL("../middlewares/requireAuth.ts", import.meta.url),
      "utf8",
    );
    const requireAdminSource = await readFile(
      new URL("../middlewares/requireRole.ts", import.meta.url),
      "utf8",
    );
    assert.match(requireAuthSource, /respondIfUserDisabled/);
    assert.match(requireAdminSource, /respondIfUserDisabled/);
    assert.match(requireAdminSource, /export \{ requireAuth \} from "\.\/requireAuth"/);
  });

  it("blocks disabled signed-in customers from placing orders", async () => {
    const source = await readFile(new URL("../routes/orders.ts", import.meta.url), "utf8");
    assert.match(source, /respondIfUserDisabled\(customer\.status, res\)/);
  });
});
