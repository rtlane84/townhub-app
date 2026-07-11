import type { Response } from "express";

export const USER_DISABLED_MESSAGE =
  "Your account has been disabled. Contact support if you need access.";

export type AccountStatus = "ACTIVE" | "DISABLED";

export function isUserActive(status: AccountStatus | string | null | undefined): boolean {
  return status !== "DISABLED";
}

export function respondIfUserDisabled(
  status: AccountStatus | string | null | undefined,
  res: Response,
): boolean {
  if (isUserActive(status)) {
    return false;
  }

  res.status(403).json({ error: USER_DISABLED_MESSAGE });
  return true;
}
