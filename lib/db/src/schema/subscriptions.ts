import {
  pgTable,
  text,
  serial,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const businessSubscriptionStatusEnum = pgEnum("business_subscription_status", [
  "BETA",
  "TRIAL",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "SUSPENDED",
  "PAUSED",
  "INCOMPLETE",
]);

export const subscriptionBillingIntervalEnum = pgEnum("subscription_billing_interval", [
  "monthly",
  "yearly",
]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }),
  setupFee: numeric("setup_fee", { precision: 10, scale: 2 }),
  transactionFeePercent: numeric("transaction_fee_percent", { precision: 5, scale: 4 }),
  trialDays: integer("trial_days").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isBeta: boolean("is_beta").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  stripeProductId: text("stripe_product_id"),
  stripeMonthlyPriceId: text("stripe_monthly_price_id"),
  stripeYearlyPriceId: text("stripe_yearly_price_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Catalog of platform capabilities assignable to plans. */
export const subscriptionFeaturesTable = pgTable("subscription_features", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Which features each plan enables — no feature lists stored on the plan row. */
export const planFeaturesTable = pgTable(
  "plan_features",
  {
    planId: integer("plan_id").notNull(),
    featureId: integer("feature_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.planId, table.featureId] })],
);

export const businessSubscriptionsTable = pgTable("business_subscriptions", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().unique(),
  planId: integer("plan_id").notNull(),
  status: businessSubscriptionStatusEnum("status").notNull().default("TRIAL"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  renewalAt: timestamp("renewal_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  notes: text("notes"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePriceId: text("stripe_price_id"),
  billingInterval: subscriptionBillingIntervalEnum("billing_interval"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  // Stripe subscription webhook sync: WHERE stripe_subscription_id = ?
  index("business_subscriptions_stripe_subscription_id_idx").on(
    table.stripeSubscriptionId,
  ),
  // Platform metrics status counts: WHERE status IN (...)
  index("business_subscriptions_status_idx").on(table.status),
]);

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type SubscriptionFeature = typeof subscriptionFeaturesTable.$inferSelect;
export type PlanFeature = typeof planFeaturesTable.$inferSelect;
export type BusinessSubscription = typeof businessSubscriptionsTable.$inferSelect;
