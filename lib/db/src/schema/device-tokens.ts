import {
  pgTable,
  serial,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** Native / web push device registration platforms. */
export const devicePlatformEnumValues = ["IOS", "ANDROID", "WEB"] as const;
export type DevicePlatform = (typeof devicePlatformEnumValues)[number];

/**
 * Push device tokens associated with authenticated users.
 * Multiple devices per user are supported; token is unique globally.
 */
export const deviceTokensTable = pgTable(
  "device_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** APNs device token, FCM registration token, or Web Push endpoint id. */
    token: text("token").notNull(),
    platform: text("platform").notNull(), // IOS | ANDROID | WEB
    /** Optional app build / marketing version reported by the client. */
    appVersion: text("app_version"),
    /** Optional device model / browser label for support. */
    deviceLabel: text("device_label"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("device_tokens_token_uidx").on(table.token),
    index("device_tokens_user_id_idx").on(table.userId),
    index("device_tokens_platform_idx").on(table.platform),
  ],
).enableRLS();

export const insertDeviceTokenSchema = createInsertSchema(deviceTokensTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSeenAt: true,
});
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type DeviceToken = typeof deviceTokensTable.$inferSelect;
