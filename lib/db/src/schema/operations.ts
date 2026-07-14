import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Stripe webhook idempotency — one row per processed event id. */
export const stripeWebhookEventsTable = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** Guest checkout idempotency for duplicate POST /orders submissions. */
export const orderIdempotencyKeysTable = pgTable("order_idempotency_keys", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  orderId: integer("order_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
