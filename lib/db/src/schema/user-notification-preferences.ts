import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Per-user notification category preferences.
 * Absence of a row means the category uses its default (enabled).
 * Channel-specific business settings (email/SMS/Discord/ntfy) remain on `businesses`.
 */
export const userNotificationPreferencesTable = pgTable(
  "user_notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Stable category key from the notification category registry. */
    category: text("category").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_notification_preferences_user_category_uidx").on(
      table.userId,
      table.category,
    ),
    index("user_notification_preferences_user_id_idx").on(table.userId),
  ],
).enableRLS();

export const insertUserNotificationPreferenceSchema = createInsertSchema(
  userNotificationPreferencesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserNotificationPreference = z.infer<
  typeof insertUserNotificationPreferenceSchema
>;
export type UserNotificationPreference =
  typeof userNotificationPreferencesTable.$inferSelect;
