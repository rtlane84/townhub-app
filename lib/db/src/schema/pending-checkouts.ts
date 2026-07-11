import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Pre-payment Stripe checkout snapshot.
 * A real `orders` row is only created after Stripe confirms payment (webhook / confirm).
 */
export const pendingCheckoutsTable = pgTable(
  "pending_checkouts",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    status: text("status").notNull().default("OPEN"),
    fulfillmentType: text("fulfillment_type").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    customerUserId: text("customer_user_id"),
    deliveryAddress: text("delivery_address"),
    notes: text("notes"),
    specialFields: text("special_fields"),
    /** Priced line items + option snapshots locked at checkout start. */
    itemsJson: jsonb("items_json").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    taxRatePercent: numeric("tax_rate_percent", { precision: 5, scale: 2 }),
    taxLabel: text("tax_label"),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    estimatedWindowStart: timestamp("estimated_window_start", { withTimezone: true }),
    estimatedWindowEnd: timestamp("estimated_window_end", { withTimezone: true }),
    stripeSessionId: text("stripe_session_id"),
    stripeConnectedAccountId: text("stripe_connected_account_id"),
    /** Set when the paid order is materialized — unique for idempotency. */
    orderId: integer("order_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("pending_checkouts_stripe_session_uidx").on(table.stripeSessionId),
    uniqueIndex("pending_checkouts_order_id_uidx").on(table.orderId),
    index("pending_checkouts_business_status_idx").on(table.businessId, table.status),
    index("pending_checkouts_expires_at_idx").on(table.expiresAt),
  ],
);

export type PendingCheckout = typeof pendingCheckoutsTable.$inferSelect;
export type InsertPendingCheckout = typeof pendingCheckoutsTable.$inferInsert;

export type PendingCheckoutItemSnapshot = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxable: boolean;
  options: Array<{
    optionId: number | null;
    groupName: string;
    optionName: string;
    priceAdjustment: number;
  }>;
};
