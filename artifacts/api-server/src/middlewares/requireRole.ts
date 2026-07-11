import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { respondIfUserDisabled } from "../lib/user-account-status";

export { requireAuth } from "./requireAuth";

/**
 * Middleware: requires an authenticated ACTIVE ADMIN user.
 * Returns 401 if not logged in, 403 if logged in but not an active admin.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select({ role: usersTable.role, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  if (respondIfUserDisabled(user.status, res)) {
    return;
  }

  next();
}
