export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED";

export function formatUserRoleLabel(role: string): string {
  return role.replace(/_/g, " ");
}

export function isSensitiveRoleChange(
  currentRole: UserRole,
  newRole: UserRole,
): boolean {
  return (
    (currentRole !== "ADMIN" && newRole === "ADMIN") ||
    (currentRole === "ADMIN" && newRole !== "ADMIN") ||
    (currentRole === "BUSINESS_OWNER" && newRole === "CUSTOMER") ||
    (currentRole === "CUSTOMER" && newRole === "ADMIN")
  );
}

export function validateRoleChange(input: {
  actorUserId: string;
  targetUserId: string;
  targetCurrentRole: UserRole;
  newRole: UserRole;
  activeAdminCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (input.targetCurrentRole === input.newRole) {
    return { ok: false, error: "User already has this role." };
  }

  if (input.targetCurrentRole === "ADMIN" && input.newRole !== "ADMIN") {
    if (input.actorUserId === input.targetUserId) {
      return { ok: false, error: "You cannot remove your own admin role." };
    }
    if (input.activeAdminCount <= 1) {
      return { ok: false, error: "Cannot demote the last active platform admin." };
    }
  }

  return { ok: true };
}

export function validateUserStatusChange(input: {
  actorUserId: string;
  targetUserId: string;
  targetRole: UserRole;
  targetStatus: UserStatus;
  newStatus: UserStatus;
  activeAdminCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (input.newStatus === input.targetStatus) {
    return { ok: false, error: "User already has this status." };
  }

  if (input.newStatus === "DISABLED") {
    if (input.actorUserId === input.targetUserId) {
      return { ok: false, error: "You cannot disable your own account." };
    }
    if (input.targetRole === "ADMIN" && input.activeAdminCount <= 1) {
      return { ok: false, error: "Cannot disable the last active platform admin." };
    }
  }

  return { ok: true };
}
