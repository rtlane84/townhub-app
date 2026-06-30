import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db, businessesTable, ordersTable, usersTable } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import type { Business } from "@workspace/db";

import { authorizeBusinessOwnerAccess } from "./business-owner-access";

export type OwnedBusinessSummary = {
  id: number;
  name: string;
  slug: string;
  type: string;
  active: boolean;
};

function parseRequestedBusinessId(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const id = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

export function requestedBusinessIdFromRequest(req: Request): number | undefined {
  return parseRequestedBusinessId(req.query.businessId);
}

export async function listOwnedBusinesses(ownerId: string): Promise<OwnedBusinessSummary[]> {
  const rows = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      slug: businessesTable.slug,
      type: businessesTable.type,
      active: businessesTable.active,
    })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, ownerId))
    .orderBy(businessesTable.name);

  return rows;
}

export async function listOwnedBusinessIds(ownerId: string): Promise<number[]> {
  const rows = await listOwnedBusinesses(ownerId);
  return rows.map((row) => row.id);
}

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

/**
 * Resolve the business an owner is acting on. Validates requested id against ownership.
 */
export async function resolveSelectedOwnedBusiness(
  ownerId: string,
  requestedBusinessId?: number | null,
): Promise<Business | null> {
  if (requestedBusinessId != null) {
    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, requestedBusinessId));

    if (!business || business.ownerId !== ownerId) {
      return null;
    }
    return business;
  }

  return getPrimaryOwnedBusiness(ownerId);
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

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const access = authorizeBusinessOwnerAccess({
    userId,
    userRole: user?.role,
    businessOwnerId: business.ownerId,
  });

  if (!access.ok) {
    return access;
  }

  return { ok: true, business, isAdmin: access.isAdmin };
}
