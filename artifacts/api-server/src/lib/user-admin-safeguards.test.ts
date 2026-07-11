import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSensitiveRoleChange,
  validateRoleChange,
  validateUserStatusChange,
} from "./user-admin-safeguards.ts";

describe("user-admin-safeguards", () => {
  it("flags sensitive role changes", () => {
    assert.equal(isSensitiveRoleChange("CUSTOMER", "ADMIN"), true);
    assert.equal(isSensitiveRoleChange("ADMIN", "CUSTOMER"), true);
    assert.equal(isSensitiveRoleChange("BUSINESS_OWNER", "CUSTOMER"), true);
    assert.equal(isSensitiveRoleChange("CUSTOMER", "BUSINESS_OWNER"), false);
  });

  it("blocks self admin demotion", () => {
    const result = validateRoleChange({
      actorUserId: "admin-1",
      targetUserId: "admin-1",
      targetCurrentRole: "ADMIN",
      newRole: "CUSTOMER",
      activeAdminCount: 2,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /cannot remove your own admin role/i);
    }
  });

  it("blocks demoting the last active admin", () => {
    const result = validateRoleChange({
      actorUserId: "admin-2",
      targetUserId: "admin-1",
      targetCurrentRole: "ADMIN",
      newRole: "CUSTOMER",
      activeAdminCount: 1,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /last active platform admin/i);
    }
  });

  it("blocks disabling self", () => {
    const result = validateUserStatusChange({
      actorUserId: "admin-1",
      targetUserId: "admin-1",
      targetRole: "ADMIN",
      targetStatus: "ACTIVE",
      newStatus: "DISABLED",
      activeAdminCount: 2,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /cannot disable your own account/i);
    }
  });

  it("blocks disabling the last active admin", () => {
    const result = validateUserStatusChange({
      actorUserId: "admin-2",
      targetUserId: "admin-1",
      targetRole: "ADMIN",
      targetStatus: "ACTIVE",
      newStatus: "DISABLED",
      activeAdminCount: 1,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /last active platform admin/i);
    }
  });
});
