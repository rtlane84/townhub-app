import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Single-row platform-wide settings table. Always upsert with id = 1.
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#1E3A8A"),
  accentColor: text("accent_color").notNull().default("#F59E0B"),
  backgroundColor: text("background_color").notNull().default("#F8FAFC"),
  buttonColor: text("button_color").notNull().default("#1E3A8A"),
  headingColor: text("heading_color"),
  platformName: text("platform_name"),
  townName: text("town_name"),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  heroOverlayColor: text("hero_overlay_color").default("#000000"),
  heroOverlayOpacity: integer("hero_overlay_opacity").notNull().default(45),
  heroButtonColor: text("hero_button_color").default("#ffffff"),
  heroHeadlineAccentColor: text("hero_headline_accent_color"),
  heroHeadlineLine1: text("hero_headline_line1"),
  heroHeadlineLine2: text("hero_headline_line2"),
  logoSizePx: integer("logo_size_px").notNull().default(24),
  weatherEnabled: boolean("weather_enabled").notNull().default(false),
  weatherLocation: text("weather_location"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
