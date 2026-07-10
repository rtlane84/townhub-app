export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "ADMIN";

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

export function canChangeOwnAdminRole(
  actorUserId: string,
  targetUserId: string,
  currentRole: UserRole,
  newRole: UserRole,
): boolean {
  if (actorUserId !== targetUserId) return true;
  return !(currentRole === "ADMIN" && newRole !== "ADMIN");
}

export function canDisableUser(
  actorUserId: string,
  targetUserId: string,
): boolean {
  return actorUserId !== targetUserId;
}
