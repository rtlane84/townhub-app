import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const refundStatusEnum = pgEnum("refund_status", [
  "NONE",
  "PARTIAL",
  "FULL",
  "FAILED",
]);

export const orderRefundRecordStatusEnum = pgEnum("order_refund_record_status", [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
]);

export const orderRefundsTable = pgTable("order_refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  businessId: integer("business_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason"),
  stripeRefundId: text("stripe_refund_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: orderRefundRecordStatusEnum("status").notNull().default("PENDING"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("order_refunds_order_id_idx").on(table.orderId),
  index("order_refunds_stripe_refund_id_idx").on(table.stripeRefundId),
  uniqueIndex("order_refunds_one_pending_per_order_idx")
    .on(table.orderId)
    .where(sql`${table.status} = 'PENDING'`),
]).enableRLS();

export const insertOrderRefundSchema = createInsertSchema(orderRefundsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderRefund = z.infer<typeof insertOrderRefundSchema>;
export type OrderRefund = typeof orderRefundsTable.$inferSelect;
