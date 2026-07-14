import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Homepage town-photo carousel slide stored on platform_settings.town_photos. */
export type TownPhoto = {
  id: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

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
  showListBusinessButton: boolean("show_list_business_button")
    .notNull()
    .default(true),
  /** When false, hero/town-photo overlay image is kept but not shown on the homepage. */
  showHeroOverlay: boolean("show_hero_overlay").notNull().default(true),
  heroButtonPlacement: text("hero_button_placement")
    .notNull()
    .default("bottom-center"),
  logoSizePx: integer("logo_size_px").notNull().default(24),
  weatherEnabled: boolean("weather_enabled").notNull().default(false),
  weatherLocation: text("weather_location"),
  /**
   * IANA timezone for platform civil dates ("today"), hours, and mobile stops.
   * Default America/New_York suits the Clay WV pilot without hardcoding locality.
   */
  timezone: text("timezone").notNull().default("America/New_York"),
  /** Ordered homepage town photos for the hero carousel. Empty = fall back to heroImageUrl. */
  townPhotos: jsonb("town_photos").$type<TownPhoto[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
