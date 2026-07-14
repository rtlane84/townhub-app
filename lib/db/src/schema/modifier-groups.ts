import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

export const modifierSelectionTypeEnum = pgEnum("modifier_selection_type", [
  "SINGLE",
  "MULTIPLE",
]);

/** Reusable modifier group owned by a business. */
export const modifierGroupsTable = pgTable("modifier_groups", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  selectionType: modifierSelectionTypeEnum("selection_type").notNull().default("SINGLE"),
  required: boolean("required").notNull().default(false),
  maxSelections: integer("max_selections"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export const modifierChoicesTable = pgTable("modifier_choices", {
  id: serial("id").primaryKey(),
  modifierGroupId: integer("modifier_group_id").notNull(),
  name: text("name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

/** Assigns modifier groups to products. overrideConfig reserved for future per-product overrides. */
export const productModifierGroupsTable = pgTable("product_modifier_groups", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  modifierGroupId: integer("modifier_group_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  overrideConfig: jsonb("override_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type ModifierGroup = typeof modifierGroupsTable.$inferSelect;
export type ModifierChoice = typeof modifierChoicesTable.$inferSelect;
export type ProductModifierGroup = typeof productModifierGroupsTable.$inferSelect;
