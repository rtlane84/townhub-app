import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderId: integer("order_id"),
  appointmentRequestId: integer("appointment_request_id"),
  /** EMAIL | SMS | DISCORD | NTFY | PUSH */
  channel: text("channel").notNull().default("EMAIL"),
  eventType: text("event_type"),
  /** @deprecated Legacy alias — use eventType */
  type: text("type"),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  /** Authenticated user id when delivery targets a user (e.g. PUSH). */
  recipientUserId: text("recipient_user_id"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("LOGGED"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Admin notification log viewer ORDER BY created_at DESC (+ optional filters)
  index("notification_logs_created_at_idx").on(table.createdAt),
  // Subscription dedup lookup: WHERE business_id = ? AND event_type = ?
  index("notification_logs_business_event_type_idx").on(
    table.businessId,
    table.eventType,
  ),
]);

export type NotificationLog = typeof notificationLogsTable.$inferSelect;
