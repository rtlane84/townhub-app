import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  // Storefront/menu categories: WHERE business_id = ? ORDER BY sort_order, name
  index("categories_business_sort_order_idx").on(table.businessId, table.sortOrder),
]);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

export const productItemTypeEnum = pgEnum("product_item_type", [
  "MENU_ITEM",
  "PRODUCT",
  "SERVICE",
]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  prepTimeMinutes: integer("prep_time_minutes"),
  taxable: boolean("taxable").notNull().default(true),
  itemType: productItemTypeEnum("item_type").notNull().default("PRODUCT"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  // Storefront product list: WHERE business_id = ? [AND available] [AND category_id]
  index("products_business_available_category_idx").on(
    table.businessId,
    table.available,
    table.categoryId,
  ),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
