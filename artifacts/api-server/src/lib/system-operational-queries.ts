import { sql, eq, desc, and, inArray } from "drizzle-orm";

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
  actorLabel?: string;
  businessId?: number;
  businessName?: string;
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

export async function queryLastMigrationHint(): Promise<string | null> {
  try {
    const { db } = await import("@workspace/db");
    const result = await db.execute(sql`
      SELECT MAX(updated_at) AS last_updated
      FROM (
        SELECT updated_at FROM platform_settings
        UNION ALL
        SELECT updated_at FROM subscription_plans
        UNION ALL
        SELECT updated_at FROM subscription_features
      ) AS schema_touchpoints
    `);
    const row = result.rows[0] as { last_updated?: string | Date } | undefined;
    if (!row?.last_updated) return "Schema managed via drizzle-kit push (no migration history table)";
    const date = row.last_updated instanceof Date ? row.last_updated : new Date(row.last_updated);
    if (Number.isNaN(date.getTime())) return "Schema managed via drizzle-kit push";
    return `Latest schema touchpoint: ${date.toISOString()}`;
  } catch {
    return "Schema managed via drizzle-kit push (no migration history table)";
  }
}

export async function queryStripeSubscriptionCounts(): Promise<{
  active: number;
  trial: number;
  pastDue: number;
} | null> {
  try {
    const { db, businessSubscriptionsTable } = await import("@workspace/db");
    const rows = await db.select({ status: businessSubscriptionsTable.status }).from(businessSubscriptionsTable);

    const activeStatuses = new Set(["ACTIVE", "BETA"]);
    const trialStatuses = new Set(["TRIAL", "TRIALING"]);

    return {
      active: rows.filter((r) => activeStatuses.has(r.status)).length,
      trial: rows.filter((r) => trialStatuses.has(r.status)).length,
      pastDue: rows.filter((r) => r.status === "PAST_DUE").length,
    };
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
      usersTable,
    } = await import("@workspace/db");

    const entries: PlatformActivityEntry[] = [];

    const applications = await db
      .select()
      .from(businessApplicationsTable)
      .orderBy(desc(businessApplicationsTable.createdAt))
      .limit(25);

    for (const app of applications) {
      if (app.status === "PENDING") {
        entries.push({
          id: `application-submitted-${app.id}`,
          type: "application_submitted",
          title: "Business application submitted",
          detail: app.name,
          actorLabel: app.userEmail ?? app.userId,
          timestamp: app.createdAt.toISOString(),
        });
      }
      if (app.status === "APPROVED" && app.reviewedAt) {
        entries.push({
          id: `application-approved-${app.id}`,
          type: "application_approved",
          title: "Business application approved",
          detail: app.name,
          actorLabel: app.reviewedBy ?? undefined,
          businessId: app.businessId ?? undefined,
          timestamp: app.reviewedAt.toISOString(),
        });
      }
      if (app.status === "REJECTED" && app.reviewedAt) {
        entries.push({
          id: `application-rejected-${app.id}`,
          type: "application_rejected",
          title: "Business application rejected",
          detail: app.reviewNote ? `${app.name} — ${app.reviewNote}` : app.name,
          actorLabel: app.reviewedBy ?? undefined,
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
        trialEndsAt: businessSubscriptionsTable.trialEndsAt,
        businessName: businessesTable.name,
      })
      .from(businessSubscriptionsTable)
      .leftJoin(businessesTable, eq(businessesTable.id, businessSubscriptionsTable.businessId))
      .orderBy(desc(businessSubscriptionsTable.updatedAt))
      .limit(25);

    for (const sub of subscriptions) {
      const name = sub.businessName ?? `Business #${sub.businessId}`;
      const base = { businessId: sub.businessId, businessName: name };

      entries.push({
        id: `subscription-started-${sub.id}`,
        type: "subscription_started",
        title: "Subscription started",
        detail: `${name} · ${sub.status}`,
        ...base,
        timestamp: sub.startedAt.toISOString(),
      });

      if (sub.status === "CANCELED") {
        entries.push({
          id: `subscription-canceled-${sub.id}`,
          type: "subscription_canceled",
          title: "Subscription canceled",
          detail: name,
          ...base,
          timestamp: sub.updatedAt.toISOString(),
        });
      }

      if (sub.status === "PAST_DUE") {
        entries.push({
          id: `subscription-past-due-${sub.id}`,
          type: "subscription_past_due",
          title: "Subscription past due",
          detail: name,
          ...base,
          timestamp: sub.updatedAt.toISOString(),
        });
      }

      if (sub.status === "SUSPENDED") {
        entries.push({
          id: `subscription-expired-${sub.id}`,
          type: "subscription_expired",
          title: "Subscription expired",
          detail: name,
          ...base,
          timestamp: sub.updatedAt.toISOString(),
        });
      }

      if (sub.status === "ACTIVE" && sub.updatedAt.getTime() > sub.startedAt.getTime() + 60_000) {
        entries.push({
          id: `subscription-renewed-${sub.id}-${sub.updatedAt.toISOString()}`,
          type: "subscription_renewed",
          title: "Subscription renewed",
          detail: name,
          ...base,
          timestamp: sub.updatedAt.toISOString(),
        });
      }
    }

    const stripeBusinesses = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
        stripeConnectStatus: businessesTable.stripeConnectStatus,
        stripeConnectedAccountId: businessesTable.stripeConnectedAccountId,
        updatedAt: businessesTable.updatedAt,
      })
      .from(businessesTable)
      .where(inArray(businessesTable.stripeConnectStatus, ["connected", "pending"]))
      .orderBy(desc(businessesTable.updatedAt))
      .limit(15);

    for (const business of stripeBusinesses) {
      if (business.stripeConnectStatus === "connected" && business.stripeConnectedAccountId) {
        entries.push({
          id: `stripe-connected-${business.id}-${business.updatedAt.toISOString()}`,
          type: "stripe_account_connected",
          title: "Stripe account connected",
          detail: business.name,
          businessId: business.id,
          businessName: business.name,
          timestamp: business.updatedAt.toISOString(),
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
      .limit(15);

    for (const order of recentOrders) {
      entries.push({
        id: `order-placed-${order.id}`,
        type: "order_placed",
        title: "Order placed",
        detail: `${order.businessName ?? `Business #${order.businessId}`} · Order #${order.id}`,
        businessId: order.businessId,
        businessName: order.businessName ?? undefined,
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

      if (settings.weatherEnabled != null) {
        entries.push({
          id: `weather-settings-${settings.updatedAt.toISOString()}`,
          type: "weather_settings_updated",
          title: "Weather settings updated",
          detail: settings.weatherLocation ?? settings.townName ?? "Platform weather",
          timestamp: settings.updatedAt.toISOString(),
        });
      }
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

    const adminUsers = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "ADMIN"))
      .orderBy(desc(usersTable.updatedAt))
      .limit(5);

    for (const admin of adminUsers) {
      entries.push({
        id: `admin-account-${admin.id}-${admin.updatedAt.toISOString()}`,
        type: "admin_login",
        title: "Admin account activity",
        detail: admin.email ?? admin.name ?? admin.id,
        actorLabel: admin.email ?? admin.name ?? admin.id,
        timestamp: admin.updatedAt.toISOString(),
      });
    }

    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  } catch {
    return [];
  }
}
