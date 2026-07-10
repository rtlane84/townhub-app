export function resolveSetupRedirectPath(
  setupComplete: boolean,
  role: string | undefined,
): string | null {
  if (!setupComplete) return null;
  return role === "ADMIN" ? "/dashboard/admin" : "/";
}
