import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  userNotificationPreferencesTable,
  type UserNotificationPreference,
} from "@workspace/db";
import {
  getNotificationCategory,
  NOTIFICATION_CATEGORIES,
  type NotificationAudience,
  type NotificationCategoryKey,
} from "./notification-categories";
import {
  resolvePreferencesFromRows,
  type ResolvedPreference,
} from "./user-notification-preferences-resolve";

export type { ResolvedPreference };
export { resolvePreferencesFromRows } from "./user-notification-preferences-resolve";

export async function loadUserPreferenceRows(
  userId: string,
): Promise<UserNotificationPreference[]> {
  return db
    .select()
    .from(userNotificationPreferencesTable)
    .where(eq(userNotificationPreferencesTable.userId, userId));
}

export async function getUserNotificationPreferences(
  userId: string,
  options?: { audience?: NotificationAudience; implementedOnly?: boolean },
): Promise<ResolvedPreference[]> {
  const rows = await loadUserPreferenceRows(userId);
  return resolvePreferencesFromRows(rows, options);
}

export async function isCategoryEnabledForUser(
  userId: string,
  category: NotificationCategoryKey | string,
): Promise<boolean> {
  const def = getNotificationCategory(category);
  if (!def) return true;
  // Mandatory categories cannot be disabled.
  if (def.userToggleable === false) return true;

  const [row] = await db
    .select()
    .from(userNotificationPreferencesTable)
    .where(
      and(
        eq(userNotificationPreferencesTable.userId, userId),
        eq(userNotificationPreferencesTable.category, category),
      ),
    )
    .limit(1);

  if (!row) return def.defaultEnabled;
  return row.enabled;
}

export async function upsertUserNotificationPreferences(
  userId: string,
  updates: Array<{ category: string; enabled: boolean }>,
): Promise<ResolvedPreference[]> {
  const valid = updates.filter((u) => {
    const def = getNotificationCategory(u.category);
    return Boolean(def) && def!.userToggleable !== false;
  });
  if (valid.length === 0) {
    return getUserNotificationPreferences(userId);
  }

  for (const update of valid) {
    await db
      .insert(userNotificationPreferencesTable)
      .values({
        userId,
        category: update.category,
        enabled: update.enabled,
      })
      .onConflictDoUpdate({
        target: [
          userNotificationPreferencesTable.userId,
          userNotificationPreferencesTable.category,
        ],
        set: {
          enabled: update.enabled,
          updatedAt: new Date(),
        },
      });
  }

  return getUserNotificationPreferences(userId);
}

/** Bulk-check which of the given categories are enabled for a user. */
export async function filterEnabledCategoriesForUser(
  userId: string,
  categories: NotificationCategoryKey[],
): Promise<Set<NotificationCategoryKey>> {
  if (categories.length === 0) return new Set();

  const rows = await db
    .select()
    .from(userNotificationPreferencesTable)
    .where(
      and(
        eq(userNotificationPreferencesTable.userId, userId),
        inArray(userNotificationPreferencesTable.category, categories),
      ),
    );

  const byCategory = new Map(rows.map((row) => [row.category, row.enabled]));
  const enabled = new Set<NotificationCategoryKey>();
  for (const key of categories) {
    const def = NOTIFICATION_CATEGORIES[key];
    if (def.userToggleable === false) {
      enabled.add(key);
      continue;
    }
    const stored = byCategory.get(key);
    if (stored === undefined ? def.defaultEnabled : stored) {
      enabled.add(key);
    }
  }
  return enabled;
}
