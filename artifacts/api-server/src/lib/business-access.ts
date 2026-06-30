import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db, businessesTable, ordersTable, usersTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import type { Business } from "@workspace/db";

/**
 * When an owner has multiple businesses, pick the one with the most orders.
 * Tie-break by lowest id so behavior is stable.
 */
export async function getPrimaryOwnedBusiness(ownerId: string): Promise<Business | null> {
  const owned = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, ownerId));

  if (owned.length === 0) return null;
  if (owned.length === 1) return owned[0]!;

  const orderCounts = await db
    .select({
      businessId: ordersTable.businessId,
      orderCount: count(),
    })
    .from(ordersTable)
    .where(inArray(ordersTable.businessId, owned.map((business) => business.id)))
    .groupBy(ordersTable.businessId);

  const countByBusiness = new Map(
    orderCounts.map((row) => [row.businessId, Number(row.orderCount)]),
  );

  owned.sort((a, b) => {
    const countDiff = (countByBusiness.get(b.id) ?? 0) - (countByBusiness.get(a.id) ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.id - b.id;
  });

  return owned[0]!;
}

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
