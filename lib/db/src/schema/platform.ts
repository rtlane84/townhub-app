import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
  logoSizePx: integer("logo_size_px").notNull().default(24),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
