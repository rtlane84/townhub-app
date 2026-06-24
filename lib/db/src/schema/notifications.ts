import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderId: integer("order_id").notNull(),
  type: text("type").notNull(), // ORDER_PLACED_BUSINESS | ORDER_PLACED_CUSTOMER | ORDER_STATUS_UPDATE
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("LOGGED"), // SENT | LOGGED | FAILED
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLogsTable.$inferSelect;
