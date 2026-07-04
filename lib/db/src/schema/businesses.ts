import {
  pgTable,
  text,
  serial,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export type StructuredHoursJson = Array<{
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}>;
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
  "SALON",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "ONLINE_ONLY",
  "PAY_AT_PICKUP_ONLY",
  "BOTH",
]);

export const storefrontModeEnum = pgEnum("storefront_mode", [
  "ORDERING",
  "APPOINTMENT",
  "INFORMATION",
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
  websiteUrl: text("website_url"),
  showWebsiteCard: boolean("show_website_card").notNull().default(false),
  hours: text("hours"),
  structuredHours: jsonb("structured_hours").$type<StructuredHoursJson | null>(),
  active: boolean("active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  featured: boolean("featured").notNull().default(false),

  // Fulfillment options
  pickupEnabled: boolean("pickup_enabled").notNull().default(true),
  deliveryEnabled: boolean("delivery_enabled").notNull().default(false),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }),
  minimumOrder: numeric("minimum_order", { precision: 10, scale: 2 }),
  minimumOrderForDelivery: numeric("minimum_order_for_delivery", { precision: 10, scale: 2 }),
  deliveryRadiusMiles: numeric("delivery_radius_miles", { precision: 5, scale: 1 }),
  deliveryNotes: text("delivery_notes"),
  pickupInstructions: text("pickup_instructions"),
  deliveryInstructions: text("delivery_instructions"),

  // Sales tax (business-configured rate; no jurisdiction automation)
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxRatePercent: numeric("tax_rate_percent", { precision: 5, scale: 2 }),
  taxLabel: text("tax_label").notNull().default("Sales Tax"),

  payAtPickupEnabled: boolean("pay_at_pickup_enabled").notNull().default(false),
  paymentMode: paymentModeEnum("payment_mode"),
  orderCutoffTime: text("order_cutoff_time"),
  defaultPrepMinutes: integer("default_prep_minutes").notNull().default(15),

  // Stripe Connect (per-business connected account for card payments)
  stripeConnectedAccountId: text("stripe_connected_account_id"),
  stripeConnectStatus: text("stripe_connect_status").notNull().default("not_connected"),

  // Owner notifications
  orderNotificationEmail: text("order_notification_email"),
  notificationEmail: text("notification_email"),
  notificationPhone: text("notification_phone"),
  notifyNewOrdersByEmail: boolean("notify_new_orders_by_email").notNull().default(true),
  notifyNewOrdersBySms: boolean("notify_new_orders_by_sms").notNull().default(false),
  notifyAppointmentRequestsByEmail: boolean("notify_appointment_requests_by_email").notNull().default(true),
  notifyAppointmentRequestsBySms: boolean("notify_appointment_requests_by_sms").notNull().default(false),

  // Food truck mode
  eventLocationEnabled: boolean("event_location_enabled").notNull().default(false),

  // Storefront experience: online ordering vs appointment requests
  storefrontMode: storefrontModeEnum("storefront_mode"),

  // Per-business storefront theming
  accentColor: text("accent_color"),
  buttonColor: text("button_color"),
  bannerText: text("banner_text"),

  ownerId: text("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Food truck location schedule entries
export const foodTruckLocationsTable = pgTable("food_truck_locations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  locationName: text("location_name").notNull(),
  address: text("address"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationDate: text("location_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  locationNotes: text("location_notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
