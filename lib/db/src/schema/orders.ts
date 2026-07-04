import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { refundStatusEnum } from "./order-refunds";

export const orderStatusEnum = pgEnum("order_status", [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELED",
]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "PICKUP",
  "DELIVERY",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  orderNumber: text("order_number").notNull().unique(),
  status: orderStatusEnum("status").notNull().default("NEW"),
  fulfillmentType: fulfillmentTypeEnum("fulfillment_type")
    .notNull()
    .default("PICKUP"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerUserId: text("customer_user_id"),
  deliveryAddress: text("delivery_address"),
  pickupTime: text("pickup_time"),
  notes: text("notes"),
  specialFields: text("special_fields"), // JSON string
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull().default("STRIPE"),
  stripeSessionId: text("stripe_session_id"),
  stripeConnectedAccountId: text("stripe_connected_account_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),
  refundStatus: refundStatusEnum("refund_status").notNull().default("NONE"),
  lastRefundedAt: timestamp("last_refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

/** Snapshot of selected options at order time. */
export const orderItemOptionsTable = pgTable("order_item_options", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull(),
  optionId: integer("option_id"),
  groupName: text("group_name").notNull(),
  optionName: text("option_name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({
  id: true,
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type OrderItemOption = typeof orderItemOptionsTable.$inferSelect;
