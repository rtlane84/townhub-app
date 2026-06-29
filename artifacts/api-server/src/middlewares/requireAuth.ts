import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { usersTable } from "@workspace/db";
import { ClerkUserDesyncError, ensureDbUserForClerkSession } from "../lib/ensure-db-user";

export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "ADMIN";

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    req.dbUser = await ensureDbUserForClerkSession({
      userId,
      sessionClaims: (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })
        ?.auth?.sessionClaims,
    });
  } catch (err) {
    if (err instanceof ClerkUserDesyncError) {
      res.status(409).json({
        error: err.message,
        currentClerkUserId: err.currentClerkUserId,
        localUserId: err.localUserId,
        relinkCommand: err.relinkCommand,
      });
      return;
    }
    throw err;
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    await requireAuth(req, res, async () => {
      if (!req.dbUser || !roles.includes(req.dbUser.role as UserRole)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
