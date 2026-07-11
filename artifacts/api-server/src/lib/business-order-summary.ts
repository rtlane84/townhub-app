import { db, ordersTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { serializeOrdersBatch } from "./order-serialization";
import {
  buildBusinessOrderSummaryPayload,
  type BusinessOrderSummaryPayload,
} from "./business-order-summary-payload";

const PENDING_ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING"] as const;

/** Owner-facing lists: paid card orders + all pay-at-pickup (see isBusinessActionableOrder). */
const PAID_OR_IN_PERSON = sql`(coalesce(${ordersTable.paymentMethod}, 'STRIPE') <> 'STRIPE' OR ${ordersTable.paymentStatus} = 'PAID')`;

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
          PAID_OR_IN_PERSON,
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
          PAID_OR_IN_PERSON,
        ),
      ),
    db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.businessId, businessId), PAID_OR_IN_PERSON))
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
