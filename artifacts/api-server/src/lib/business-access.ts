import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db, businessesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Business } from "@workspace/db";

export type BusinessAccessResult =
  | { ok: true; business: Business; isAdmin: boolean }
  | { ok: false; status: number; error: string };

export async function authorizeBusinessOwnerOrAdmin(
  req: Request,
  businessId: number,
): Promise<BusinessAccessResult> {
  const { userId } = getAuth(req);
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    return { ok: false, status: 404, error: "Business not found" };
  }

  if (business.ownerId === userId) {
    return { ok: true, business, isAdmin: false };
  }

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (user?.role === "ADMIN") {
    return { ok: true, business, isAdmin: true };
  }

  return { ok: false, status: 403, error: "Forbidden: business owner access required" };
}
