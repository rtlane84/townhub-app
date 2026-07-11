import type { Request } from "express";
import { authorizeBusinessOwnerOrAdmin } from "./business-access";

/** Owners and admins may list unavailable catalog data; public callers may not. */
export async function canViewFullBusinessCatalog(
  req: Request,
  businessId: number,
): Promise<boolean> {
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  return access.ok;
}
