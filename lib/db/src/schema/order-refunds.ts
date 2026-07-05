import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
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
  // Batched refund hydration and order refund history: WHERE order_id IN (...)
  index("order_refunds_order_id_idx").on(table.orderId),
  // Stripe refund webhook idempotency: WHERE stripe_refund_id = ?
  index("order_refunds_stripe_refund_id_idx").on(table.stripeRefundId),
]);

export const insertOrderRefundSchema = createInsertSchema(orderRefundsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderRefund = z.infer<typeof insertOrderRefundSchema>;
export type OrderRefund = typeof orderRefundsTable.$inferSelect;
