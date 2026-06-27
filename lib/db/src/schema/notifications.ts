import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderId: integer("order_id"),
  appointmentRequestId: integer("appointment_request_id"),
  channel: text("channel").notNull().default("EMAIL"),
  eventType: text("event_type"),
  /** @deprecated Legacy alias — use eventType */
  type: text("type"),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("LOGGED"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLogsTable.$inferSelect;
