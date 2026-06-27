import {
  pgTable,
  text,
  serial,
  integer,
  pgEnum,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

type StructuredHoursJson = Array<{
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}>;

export const businessApplicationStatusEnum = pgEnum("business_application_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const businessApplicationsTable = pgTable("business_applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  hours: text("hours"),
  structuredHours: jsonb("structured_hours").$type<StructuredHoursJson | null>(),
  planId: integer("plan_id"),
  status: businessApplicationStatusEnum("status").notNull().default("PENDING"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  businessId: integer("business_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BusinessApplication = typeof businessApplicationsTable.$inferSelect;
