import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";

export const appointmentRequestsTable = pgTable("appointment_requests", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  serviceName: text("service_name"),
  productId: integer("product_id"),
  requestedDate: text("requested_date").notNull(),
  requestedTime: text("requested_time").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("NEW"),
  source: text("source").notNull().default("CUSTOMER"),
  statusNote: text("status_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Business appointment inbox: WHERE business_id = ? ORDER BY created_at DESC
  index("appointment_requests_business_created_at_idx").on(
    table.businessId,
    table.createdAt,
  ),
]).enableRLS();

export type AppointmentRequest = typeof appointmentRequestsTable.$inferSelect;
