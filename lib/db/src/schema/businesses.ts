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
  index,
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
  "COFFEE_SHOP",
  "BAKERY",
  "GROCERY",
  "FLORIST",
  "GARDEN_MARKET",
  "RETAIL_STORE",
  "BUILDING_SUPPLY",
  "SERVICE_PROVIDER",
  "RECREATION",
  "FUNERAL_SERVICE",
  "GENERAL",
  "SALON",
  // Legacy values retained so existing Postgres enums remain readable during migration.
  "FOOD_TRUCK",
  "CAFE_BAKERY",
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

export const orderingAvailabilityModeEnum = pgEnum("ordering_availability_mode", [
  "ALWAYS",
  "BUSINESS_HOURS",
  "MOBILE_LOCATION_SCHEDULE",
  "MANUAL",
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
  /** When false, weekly hours are hidden on the storefront (useful for mobile schedule businesses). */
  hoursEnabled: boolean("hours_enabled").notNull().default(true),
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
  /** @deprecated Fixed HH:MM cutoff is no longer shown or edited in the product UI; availability modes own the ordering window. Kept for backward-compatible API payloads. */
  orderCutoffTime: text("order_cutoff_time"),
  defaultPrepMinutes: integer("default_prep_minutes").notNull().default(15),
  /** Extra minutes added on top of prep for delivery ETAs (drive/dispatch buffer). */
  deliveryBufferMinutes: integer("delivery_buffer_minutes").notNull().default(15),
  /**
   * Stop accepting new ASAP orders this many minutes before today's closeTime
   * (BUSINESS_HOURS) or active mobile stop endTime (MOBILE_LOCATION_SCHEDULE).
   * 0 = until the exact close/end. Ignored for ALWAYS / MANUAL.
   */
  orderClosingBufferMinutes: integer("order_closing_buffer_minutes").notNull().default(0),

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
  discordWebhookUrl: text("discord_webhook_url"),
  notifyNewOrdersByDiscord: boolean("notify_new_orders_by_discord").notNull().default(false),
  notifyAppointmentRequestsByDiscord: boolean("notify_appointment_requests_by_discord").notNull().default(false),

  // Free phone push via ntfy (topic-only; server URL from NTFY_SERVER_URL)
  ntfyEnabled: boolean("ntfy_enabled").notNull().default(false),
  notifyNewOrdersByNtfy: boolean("notify_new_orders_by_ntfy").notNull().default(true),
  notifyAppointmentRequestsByNtfy: boolean("notify_appointment_requests_by_ntfy").notNull().default(true),
  ntfyTopic: text("ntfy_topic"),
  ntfyConnectedAt: timestamp("ntfy_connected_at", { withTimezone: true }),
  ntfyLastTestAt: timestamp("ntfy_last_test_at", { withTimezone: true }),

  /** Mobile / traveling business — publishes a location schedule. */
  isMobileBusiness: boolean("is_mobile_business").notNull().default(false),
  /**
   * Legacy column kept in sync with isMobileBusiness for older readers.
   * Prefer isMobileBusiness in application code.
   */
  eventLocationEnabled: boolean("event_location_enabled").notNull().default(false),

  // Storefront experience: online ordering vs appointment requests
  storefrontMode: storefrontModeEnum("storefront_mode"),

  // When online ordering is accepted (hours / mobile schedule / manual toggle)
  orderingAvailabilityMode: orderingAvailabilityModeEnum("ordering_availability_mode")
    .notNull()
    .default("ALWAYS"),
  /** MANUAL mode: owner on/off switch for accepting orders. */
  orderingEnabled: boolean("ordering_enabled").notNull().default(true),
  /** Next business-local order number to assign (starts at 101). */
  nextBusinessOrderNumber: integer("next_business_order_number").notNull().default(101),

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
}, (table) => [
  // Owner business picker: WHERE owner_id = ? AND archived_at IS NULL ORDER BY name
  index("businesses_owner_id_idx").on(table.ownerId),
  // Public directory base filter: active + not archived (+ optional type/featured)
  index("businesses_active_archived_at_idx").on(table.active, table.archivedAt),
  // Category browse filter on directory
  index("businesses_type_idx").on(table.type),
]);

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
}, (table) => [
  // Owner location schedule: WHERE business_id = ? ORDER BY location_date
  index("food_truck_locations_business_date_idx").on(
    table.businessId,
    table.locationDate,
  ),
  // Public today/upcoming endpoints: WHERE location_date = ? AND is_active
  index("food_truck_locations_date_active_idx").on(
    table.locationDate,
    table.isActive,
  ),
]);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
