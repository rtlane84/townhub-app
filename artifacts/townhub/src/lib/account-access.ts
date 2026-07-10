export type AccountStatus = "ACTIVE" | "DISABLED";

export function isAccountActive(status: AccountStatus | string | null | undefined): boolean {
  return status !== "DISABLED";
}

export function canAccessAuthenticatedAreas(
  status: AccountStatus | string | null | undefined,
): boolean {
  return isAccountActive(status);
}
