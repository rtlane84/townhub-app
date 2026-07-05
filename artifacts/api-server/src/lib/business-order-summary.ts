import { db, ordersTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { serializeOrdersBatch } from "./order-serialization";
import {
  buildBusinessOrderSummaryPayload,
  type BusinessOrderSummaryPayload,
} from "./business-order-summary-payload";

const PENDING_ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING"] as const;

export function getTodayStart(now = new Date()): Date {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return todayStart;
}

export type { BusinessOrderSummaryPayload };
export { buildBusinessOrderSummaryPayload };

export async function loadBusinessOrderSummary(
  businessId: number,
  businessName: string,
  now = new Date(),
): Promise<BusinessOrderSummaryPayload> {
  const todayStart = getTodayStart(now);

  const [todayStats, pendingStats, recentRaw] = await Promise.all([
    db
      .select({
        todayCount: sql<number>`count(*)::int`,
        todayRevenue: sql<number>`coalesce(sum(${ordersTable.total}::numeric), 0)`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.businessId, businessId),
          gte(ordersTable.createdAt, todayStart),
        ),
      ),
    db
      .select({
        pendingCount: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.businessId, businessId),
          inArray(ordersTable.status, [...PENDING_ORDER_STATUSES]),
        ),
      ),
    db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.businessId, businessId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5),
  ]);

  const recentOrders = await serializeOrdersBatch(
    recentRaw,
    () => businessName,
    { includeRefundDetails: false },
  );

  return buildBusinessOrderSummaryPayload({
    todayCount: Number(todayStats[0]?.todayCount ?? 0),
    pendingCount: Number(pendingStats[0]?.pendingCount ?? 0),
    todayRevenue: Number(todayStats[0]?.todayRevenue ?? 0),
    recentOrders,
  });
}
