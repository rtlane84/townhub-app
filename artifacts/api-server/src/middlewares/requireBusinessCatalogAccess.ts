import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "./requireRole";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";

function parseBusinessIdFromParams(req: Request): number | null {
  const raw = req.params.businessId;
  if (raw == null) return null;
  const id = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Requires auth plus business ownership or admin for catalog mutation routes. */
export function requireBusinessCatalogAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, async () => {
    const businessId = parseBusinessIdFromParams(req);
    if (!businessId) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    next();
  });
}
