import {
  pgTable,
  text,
  serial,
  boolean,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const businessTypeEnum = pgEnum("business_type", [
  "FOOD_VENDOR",
  "FLORIST",
  "GARDEN_MARKET",
  "RETAIL_STORE",
  "BUILDING_SUPPLY",
  "SERVICE_PROVIDER",
  "FUNERAL_SERVICE",
  "GENERAL",
]);

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: businessTypeEnum("type").notNull().default("GENERAL"),
  description: text("description"),
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  address: text("address"),
  phone: text("phone"),
  hours: text("hours"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  minimumOrder: numeric("minimum_order", { precision: 10, scale: 2 }),
  payAtPickupEnabled: boolean("pay_at_pickup_enabled").notNull().default(false),
  orderCutoffTime: text("order_cutoff_time"),
  ownerId: text("owner_id"), // Clerk user ID
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
