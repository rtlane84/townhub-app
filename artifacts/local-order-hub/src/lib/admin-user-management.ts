import type { ConfirmActionCopy } from "./confirm-action-copy";
import {
  formatUserRoleLabel,
  isSensitiveRoleChange,
  type UserRole,
} from "./admin-user-safeguards.ts";

export { formatUserRoleLabel, isSensitiveRoleChange };
export type { UserRole };

type UserSummary = {
  name?: string | null;
  email: string;
};

export function changeUserRoleCopy(
  user: UserSummary,
  currentRole: UserRole,
  newRole: UserRole,
): ConfirmActionCopy {
  const displayName = user.name?.trim() || user.email;
  const currentLabel = formatUserRoleLabel(currentRole);
  const newLabel = formatUserRoleLabel(newRole);
  const sensitive = isSensitiveRoleChange(currentRole, newRole);

  const body = [
    `Change role for ${displayName} (${user.email})?`,
    `Current role: ${currentLabel}`,
    `New role: ${newLabel}`,
    "Access may change immediately after you confirm.",
  ];

  if (sensitive) {
    body.push(
      "This is a sensitive role change. Double-check that this user should receive the new access level.",
    );
  }

  return {
    title: sensitive ? "Confirm sensitive role change?" : "Change user role?",
    body,
    confirmLabel: sensitive ? "Confirm role change" : "Change role",
    destructive: sensitive,
  };
}

export function disableUserCopy(user: UserSummary): ConfirmActionCopy {
  const displayName = user.name?.trim() || user.email;

  return {
    title: "Disable user?",
    body: [
      `Disable ${displayName} (${user.email})?`,
      "The account stays in TownHub and keeps its order, business, and audit history.",
      "The user will be blocked from admin, business, and signed-in customer actions until re-enabled.",
      "This does not delete the Clerk identity. Clerk deletion is a separate manual action if ever needed.",
    ],
    confirmLabel: "Disable user",
    destructive: true,
  };
}

export function enableUserCopy(user: UserSummary): ConfirmActionCopy {
  const displayName = user.name?.trim() || user.email;

  return {
    title: "Re-enable user?",
    body: [
      `Re-enable ${displayName} (${user.email})?`,
      "The user will regain access based on their current role.",
    ],
    confirmLabel: "Re-enable user",
  };
}
