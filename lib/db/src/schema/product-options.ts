import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const productOptionGroupsTable = pgTable("product_option_groups", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  required: boolean("required").notNull().default(false),
  minSelections: integer("min_selections").notNull().default(0),
  maxSelections: integer("max_selections").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export const productOptionsTable = pgTable("product_options", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  name: text("name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type ProductOptionGroup = typeof productOptionGroupsTable.$inferSelect;
export type ProductOption = typeof productOptionsTable.$inferSelect;
