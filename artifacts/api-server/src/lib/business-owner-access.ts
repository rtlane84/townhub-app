export type BusinessOwnerAccessInput = {
  userId: string;
  userRole: string | null | undefined;
  businessOwnerId: string | null | undefined;
};

export type BusinessOwnerAccessResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; status: number; error: string };

/**
 * Pure ownership check used by authorizeBusinessOwnerOrAdmin.
 * Admins may access any business; owners only their own.
 */
export function authorizeBusinessOwnerAccess(
  input: BusinessOwnerAccessInput,
): BusinessOwnerAccessResult {
  if (!input.userRole) {
    return { ok: false, status: 403, error: "Forbidden: user not found" };
  }

  if (input.userRole === "ADMIN") {
    return { ok: true, isAdmin: true };
  }

  if (!input.businessOwnerId || input.businessOwnerId !== input.userId) {
    return { ok: false, status: 403, error: "Forbidden: business owner access required" };
  }

  return { ok: true, isAdmin: false };
}
