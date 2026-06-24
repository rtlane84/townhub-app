import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

  // Upsert user in our DB (Clerk is the source of truth for identity)
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (existing.length === 0) {
    const email =
      (req as unknown as { auth?: { sessionClaims?: { email?: string } } })
        ?.auth?.sessionClaims?.email ?? `${userId}@unknown.local`;
    const [user] = await db
      .insert(usersTable)
      .values({ id: userId, email, role: "CUSTOMER" })
      .returning();
    req.dbUser = user;
  } else {
    req.dbUser = existing[0];
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
