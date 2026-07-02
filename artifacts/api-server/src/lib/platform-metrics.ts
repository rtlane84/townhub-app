import { sql, eq, and, gte, inArray, count, sum, ne } from "drizzle-orm";

export type PlatformMetrics = {
  activeBusinesses: number;
  pendingApplications: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  ordersToday: number;
  ordersThisMonth: number;
  emailsSentToday: number;
  failedEmailsToday: number;
  smsSentToday: number;
  failedSmsToday: number;
  revenueToday: number | null;
  revenueThisMonth: number | null;
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function queryPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const {
      db,
      businessesTable,
      businessApplicationsTable,
      businessSubscriptionsTable,
      ordersTable,
      notificationLogsTable,
    } = await import("@workspace/db");

    const todayStart = startOfToday();
    const monthStart = startOfMonth();

    const [activeBusinessesRow] = await db
      .select({ value: count() })
      .from(businessesTable)
      .where(eq(businessesTable.active, true));

    const [pendingApplicationsRow] = await db
      .select({ value: count() })
      .from(businessApplicationsTable)
      .where(eq(businessApplicationsTable.status, "PENDING"));

    const activeStatuses = ["ACTIVE", "BETA"] as const;
    const trialStatuses = ["TRIAL", "TRIALING"] as const;

    const [activeSubscriptionsRow] = await db
      .select({ value: count() })
      .from(businessSubscriptionsTable)
      .where(inArray(businessSubscriptionsTable.status, [...activeStatuses]));

    const [trialSubscriptionsRow] = await db
      .select({ value: count() })
      .from(businessSubscriptionsTable)
      .where(inArray(businessSubscriptionsTable.status, [...trialStatuses]));

    const [pastDueRow] = await db
      .select({ value: count() })
      .from(businessSubscriptionsTable)
      .where(eq(businessSubscriptionsTable.status, "PAST_DUE"));

    const [ordersTodayRow] = await db
      .select({ value: count() })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, todayStart));

    const [ordersMonthRow] = await db
      .select({ value: count() })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, monthStart));

    const [emailsSentTodayRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, "EMAIL"),
          eq(notificationLogsTable.status, "SENT"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    const [emailsFailedTodayRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, "EMAIL"),
          eq(notificationLogsTable.status, "FAILED"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    const [smsSentTodayRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, "SMS"),
          eq(notificationLogsTable.status, "SENT"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    const [smsFailedTodayRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, "SMS"),
          eq(notificationLogsTable.status, "FAILED"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    const [revenueTodayRow] = await db
      .select({ value: sum(ordersTable.total) })
      .from(ordersTable)
      .where(and(gte(ordersTable.createdAt, todayStart), ne(ordersTable.status, "CANCELED")));

    const [revenueMonthRow] = await db
      .select({ value: sum(ordersTable.total) })
      .from(ordersTable)
      .where(and(gte(ordersTable.createdAt, monthStart), ne(ordersTable.status, "CANCELED")));

    const parseRevenue = (value: string | null | undefined): number | null => {
      if (value == null) return null;
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      activeBusinesses: activeBusinessesRow?.value ?? 0,
      pendingApplications: pendingApplicationsRow?.value ?? 0,
      activeSubscriptions: activeSubscriptionsRow?.value ?? 0,
      trialSubscriptions: trialSubscriptionsRow?.value ?? 0,
      pastDueSubscriptions: pastDueRow?.value ?? 0,
      ordersToday: ordersTodayRow?.value ?? 0,
      ordersThisMonth: ordersMonthRow?.value ?? 0,
      emailsSentToday: emailsSentTodayRow?.value ?? 0,
      failedEmailsToday: emailsFailedTodayRow?.value ?? 0,
      smsSentToday: smsSentTodayRow?.value ?? 0,
      failedSmsToday: smsFailedTodayRow?.value ?? 0,
      revenueToday: parseRevenue(revenueTodayRow?.value ?? null),
      revenueThisMonth: parseRevenue(revenueMonthRow?.value ?? null),
    };
  } catch {
    return null;
  }
}

export type StorageUsageStats = {
  totalFiles: number;
  totalBytes: number;
  logosStored: number;
  galleryImages: number;
  publicAssets: number;
};

export async function queryStorageUsageStats(): Promise<StorageUsageStats | null> {
  try {
    const { db, mediaAssetsTable } = await import("@workspace/db");
    const rows = await db
      .select({
        businessId: mediaAssetsTable.businessId,
        byteSize: mediaAssetsTable.byteSize,
      })
      .from(mediaAssetsTable);

    let totalBytes = 0;
    let logosStored = 0;
    let galleryImages = 0;
    let publicAssets = 0;

    for (const row of rows) {
      totalBytes += row.byteSize;
      if (row.businessId == null) {
        publicAssets += 1;
      } else {
        galleryImages += 1;
      }
    }

    const { businessesTable } = await import("@workspace/db");
    const businessesWithLogos = await db
      .select({ logoUrl: businessesTable.logoUrl })
      .from(businessesTable);
    logosStored = businessesWithLogos.filter((b) => Boolean(b.logoUrl?.trim())).length;

    return {
      totalFiles: rows.length,
      totalBytes,
      logosStored,
      galleryImages,
      publicAssets,
    };
  } catch {
    return null;
  }
}

export type DatabaseStats = {
  sizeBytes: number | null;
  connectionPoolHint: string | null;
};

export async function queryDatabaseStats(): Promise<DatabaseStats> {
  try {
    const { db } = await import("@workspace/db");
    const sizeResult = await db.execute(sql`
      SELECT pg_database_size(current_database()) AS size_bytes
    `);
    const sizeRow = sizeResult.rows[0] as { size_bytes?: string | number } | undefined;
    const sizeBytes =
      sizeRow?.size_bytes != null ? Number(sizeRow.size_bytes) : null;

    return {
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
      connectionPoolHint: "Managed by Drizzle/pg driver (pool size not exposed)",
    };
  } catch {
    return { sizeBytes: null, connectionPoolHint: null };
  }
}

export type NotificationChannelCounts = {
  sentToday: number;
  failedToday: number;
};

export async function queryNotificationChannelCountsToday(
  channel: "EMAIL" | "SMS",
): Promise<NotificationChannelCounts> {
  try {
    const { db, notificationLogsTable } = await import("@workspace/db");
    const todayStart = startOfToday();

    const [sentRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, channel),
          eq(notificationLogsTable.status, "SENT"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    const [failedRow] = await db
      .select({ value: count() })
      .from(notificationLogsTable)
      .where(
        and(
          eq(notificationLogsTable.channel, channel),
          eq(notificationLogsTable.status, "FAILED"),
          gte(notificationLogsTable.createdAt, todayStart),
        ),
      );

    return {
      sentToday: sentRow?.value ?? 0,
      failedToday: failedRow?.value ?? 0,
    };
  } catch {
    return { sentToday: 0, failedToday: 0 };
  }
}
