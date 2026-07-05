import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  changeUserRoleCopy,
  disableUserCopy,
  enableUserCopy,
  isSensitiveRoleChange,
} from "./admin-user-management.ts";
import {
  canChangeOwnAdminRole,
  canDisableUser,
} from "./admin-user-safeguards.ts";
import { canAccessAuthenticatedAreas } from "./account-access.ts";

describe("admin-user-management copy", () => {
  const user = { name: "Pat Owner", email: "pat@example.com" };

  it("includes role details and immediate access warning", () => {
    const copy = changeUserRoleCopy(user, "CUSTOMER", "BUSINESS_OWNER");
    assert.match(copy.title, /change user role/i);
    assert.match(copy.body.join(" "), /pat@example.com/i);
    assert.match(copy.body.join(" "), /Current role: CUSTOMER/i);
    assert.match(copy.body.join(" "), /New role: BUSINESS OWNER/i);
    assert.match(copy.body.join(" "), /Access may change immediately/i);
  });

  it("uses stronger wording for sensitive role changes", () => {
    const copy = changeUserRoleCopy(user, "CUSTOMER", "ADMIN");
    assert.match(copy.title, /sensitive role change/i);
    assert.match(copy.body.join(" "), /sensitive role change/i);
    assert.equal(copy.destructive, true);
  });

  it("describes disable as app-level preservation", () => {
    const copy = disableUserCopy(user);
    assert.match(copy.title, /disable user/i);
    assert.match(copy.body.join(" "), /keeps its order, business, and audit history/i);
    assert.match(copy.body.join(" "), /does not delete the Clerk identity/i);
  });

  it("describes re-enable access restoration", () => {
    const copy = enableUserCopy(user);
    assert.match(copy.title, /re-enable user/i);
    assert.match(copy.body.join(" "), /regain access/i);
  });
});

describe("admin-user-safeguards", () => {
  it("detects sensitive role changes", () => {
    assert.equal(isSensitiveRoleChange("ADMIN", "CUSTOMER"), true);
    assert.equal(isSensitiveRoleChange("BUSINESS_OWNER", "CUSTOMER"), true);
  });

  it("prevents self admin demotion and self disable in UI", () => {
    assert.equal(canChangeOwnAdminRole("u1", "u1", "ADMIN", "CUSTOMER"), false);
    assert.equal(canDisableUser("u1", "u1"), false);
    assert.equal(canChangeOwnAdminRole("u1", "u2", "ADMIN", "CUSTOMER"), true);
  });
});

describe("account-access", () => {
  it("blocks disabled users from authenticated areas", () => {
    assert.equal(canAccessAuthenticatedAreas("ACTIVE"), true);
    assert.equal(canAccessAuthenticatedAreas("DISABLED"), false);
  });
});

describe("admin users page wiring", () => {
  it("requires confirmation before role and status mutations", async () => {
    const source = await readFile(
      new URL("../pages/dashboard/admin/users.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /ConfirmActionDialog/);
    assert.match(source, /changeUserRoleCopy/);
    assert.match(source, /disableUserCopy/);
    assert.match(source, /enableUserCopy/);
    assert.match(source, /setPendingRoleChange/);
    assert.match(source, /setPendingStatusChange/);
    assert.doesNotMatch(source, /onValueChange=\{\(val\) => updateRole\.mutate/);
  });
});
