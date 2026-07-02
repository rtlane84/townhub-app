import { sql, eq, desc, and } from "drizzle-orm";

export type NotificationDeliverySummary = {
  lastSuccessfulAt?: string;
  lastFailedAt?: string;
};

export type PlatformActivityEntry = {
  id: string;
  type: string;
  title: string;
  detail?: string;
  timestamp: string;
};

export async function queryAdminAccountCount(): Promise<number | null> {
  try {
    const { db, usersTable } = await import("@workspace/db");
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "ADMIN"));
    return rows.length;
  } catch {
    return null;
  }
}

export async function queryNotificationDeliverySummary(
  channel: "EMAIL" | "SMS",
): Promise<NotificationDeliverySummary> {
  try {
    const { db, notificationLogsTable } = await import("@workspace/db");
    const [lastSent] = await db
      .select({ createdAt: notificationLogsTable.createdAt })
      .from(notificationLogsTable)
      .where(and(eq(notificationLogsTable.channel, channel), eq(notificationLogsTable.status, "SENT")))
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(1);

    const [lastFailed] = await db
      .select({ createdAt: notificationLogsTable.createdAt })
      .from(notificationLogsTable)
      .where(and(eq(notificationLogsTable.channel, channel), eq(notificationLogsTable.status, "FAILED")))
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(1);

    return {
      lastSuccessfulAt: lastSent?.createdAt?.toISOString(),
      lastFailedAt: lastFailed?.createdAt?.toISOString(),
    };
  } catch {
    return {};
  }
}

/** Schema is applied via `pnpm --filter db push`; no migration history table is maintained. */
export async function queryDatabaseSchemaVersion(): Promise<string | null> {
  try {
    const { db } = await import("@workspace/db");
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'businesses', 'platform_settings', 'notification_logs')
    `);
    const tables = result.rows.map((row) => (row as { table_name: string }).table_name);
    if (tables.length === 0) return null;
    return `drizzle-kit push (${tables.length}/4 core tables)`;
  } catch {
    return null;
  }
}

export async function queryRecentPlatformActivity(limit = 50): Promise<PlatformActivityEntry[]> {
  try {
    const {
      db,
      businessApplicationsTable,
      businessSubscriptionsTable,
      businessesTable,
      ordersTable,
      platformSettingsTable,
      subscriptionPlansTable,
    } = await import("@workspace/db");

    const entries: PlatformActivityEntry[] = [];

    const applications = await db
      .select()
      .from(businessApplicationsTable)
      .orderBy(desc(businessApplicationsTable.createdAt))
      .limit(20);

    for (const app of applications) {
      if (app.status === "PENDING") {
        entries.push({
          id: `application-submitted-${app.id}`,
          type: "application_submitted",
          title: "Business application submitted",
          detail: app.name,
          timestamp: app.createdAt.toISOString(),
        });
      }
      if (app.status === "APPROVED" && app.reviewedAt) {
        entries.push({
          id: `application-approved-${app.id}`,
          type: "application_approved",
          title: "Business application approved",
          detail: app.name,
          timestamp: app.reviewedAt.toISOString(),
        });
      }
    }

    const subscriptions = await db
      .select({
        id: businessSubscriptionsTable.id,
        businessId: businessSubscriptionsTable.businessId,
        status: businessSubscriptionsTable.status,
        startedAt: businessSubscriptionsTable.startedAt,
        updatedAt: businessSubscriptionsTable.updatedAt,
        businessName: businessesTable.name,
      })
      .from(businessSubscriptionsTable)
      .leftJoin(businessesTable, eq(businessesTable.id, businessSubscriptionsTable.businessId))
      .orderBy(desc(businessSubscriptionsTable.updatedAt))
      .limit(20);

    for (const sub of subscriptions) {
      const name = sub.businessName ?? `Business #${sub.businessId}`;
      entries.push({
        id: `subscription-started-${sub.id}`,
        type: "subscription_started",
        title: "Subscription started",
        detail: `${name} · ${sub.status}`,
        timestamp: sub.startedAt.toISOString(),
      });
      if (sub.status === "CANCELED") {
        entries.push({
          id: `subscription-canceled-${sub.id}`,
          type: "subscription_canceled",
          title: "Subscription canceled",
          detail: name,
          timestamp: sub.updatedAt.toISOString(),
        });
      }
    }

    const recentOrders = await db
      .select({
        id: ordersTable.id,
        businessId: ordersTable.businessId,
        createdAt: ordersTable.createdAt,
        businessName: businessesTable.name,
      })
      .from(ordersTable)
      .leftJoin(businessesTable, eq(businessesTable.id, ordersTable.businessId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    for (const order of recentOrders) {
      entries.push({
        id: `order-placed-${order.id}`,
        type: "order_placed",
        title: "Order placed",
        detail: `${order.businessName ?? `Business #${order.businessId}`} · Order #${order.id}`,
        timestamp: order.createdAt.toISOString(),
      });
    }

    const [settings] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.id, 1));
    if (settings?.updatedAt) {
      entries.push({
        id: `settings-changed-${settings.updatedAt.toISOString()}`,
        type: "settings_changed",
        title: "Platform settings changed",
        detail: settings.platformName ?? "TownHub",
        timestamp: settings.updatedAt.toISOString(),
      });
    }

    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .orderBy(desc(subscriptionPlansTable.updatedAt))
      .limit(10);

    for (const plan of plans) {
      entries.push({
        id: `plan-changed-${plan.id}-${plan.updatedAt.toISOString()}`,
        type: "plan_changed",
        title: "Subscription plan updated",
        detail: plan.name,
        timestamp: plan.updatedAt.toISOString(),
      });
    }

    const { subscriptionFeaturesTable } = await import("@workspace/db");
    const features = await db
      .select()
      .from(subscriptionFeaturesTable)
      .orderBy(desc(subscriptionFeaturesTable.updatedAt))
      .limit(10);

    for (const feature of features) {
      entries.push({
        id: `feature-updated-${feature.id}-${feature.updatedAt.toISOString()}`,
        type: feature.isActive ? "feature_enabled" : "feature_disabled",
        title: feature.isActive ? "Feature enabled" : "Feature disabled",
        detail: feature.name,
        timestamp: feature.updatedAt.toISOString(),
      });
    }

    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  } catch {
    return [];
  }
}
