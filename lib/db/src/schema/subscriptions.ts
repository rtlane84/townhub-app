import {
  pgTable,
  text,
  serial,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const businessSubscriptionStatusEnum = pgEnum("business_subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "PAUSED",
]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull(),
  setupFee: numeric("setup_fee", { precision: 10, scale: 2 }),
  transactionFeePercent: numeric("transaction_fee_percent", { precision: 5, scale: 4 }),
  trialDays: integer("trial_days").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const businessSubscriptionsTable = pgTable("business_subscriptions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  planId: integer("plan_id").notNull(),
  status: businessSubscriptionStatusEnum("status").notNull().default("TRIALING"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type BusinessSubscription = typeof businessSubscriptionsTable.$inferSelect;
