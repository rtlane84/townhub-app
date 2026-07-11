import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Single-row platform-wide settings table. Always upsert with id = 1.
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#1E3A8A"),
  accentColor: text("accent_color").notNull().default("#F59E0B"),
  backgroundColor: text("background_color").notNull().default("#F8FAFC"),
  buttonColor: text("button_color").notNull().default("#1E3A8A"),
  headingColor: text("heading_color"),
  brandPrefixColor: text("brand_prefix_color"),
  brandTownColor: text("brand_town_color"),
  brandHubColor: text("brand_hub_color"),
  platformName: text("platform_name"),
  townName: text("town_name"),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  heroOverlayImageUrl: text("hero_overlay_image_url"),
  heroImageFit: text("hero_image_fit").notNull().default("cover"),
  heroImagePosition: text("hero_image_position").notNull().default("center"),
  heroOverlaySize: text("hero_overlay_size").notNull().default("medium"),
  heroOverlayAlign: text("hero_overlay_align").notNull().default("center"),
  showShopButton: boolean("show_shop_button").notNull().default(true),
  showListBusinessButton: boolean("show_list_business_button").notNull().default(true),
  heroButtonPlacement: text("hero_button_placement").notNull().default("bottom-center"),
  logoSizePx: integer("logo_size_px").notNull().default(24),
  weatherEnabled: boolean("weather_enabled").notNull().default(false),
  weatherLocation: text("weather_location"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
