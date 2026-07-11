import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/** Ensure delivery ETA buffer column exists (drizzle push is the primary path). */
export async function ensureDeliveryBufferMinutesColumn(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS delivery_buffer_minutes integer NOT NULL DEFAULT 15`,
  );
  logger.info("Ensured businesses.delivery_buffer_minutes column");
}

/**
 * Ensure business_type enum has identity categories (not operational modes).
 * FOOD_TRUCK / CAFE_BAKERY remain in Postgres if already present but are migrated off rows.
 */
export async function ensureBusinessTypeEnumValues(): Promise<void> {
  for (const value of [
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
    // Legacy — may already exist; ADD VALUE IF NOT EXISTS is safe
    "FOOD_TRUCK",
    "CAFE_BAKERY",
  ] as const) {
    await db.execute(
      sql.raw(`ALTER TYPE business_type ADD VALUE IF NOT EXISTS '${value}'`),
    );
  }
  logger.info("Ensured business_type enum values");
}

/**
 * Add is_mobile_business, backfill from event_location_enabled, and migrate
 * legacy FOOD_TRUCK type rows to Restaurant + mobile mode.
 */
export async function ensureMobileBusinessSchema(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_mobile_business boolean NOT NULL DEFAULT false`,
  );

  // Dual-write sync: prefer whichever flag is already true
  await db.execute(sql`
    UPDATE businesses
    SET is_mobile_business = true
    WHERE COALESCE(event_location_enabled, false) = true
      AND is_mobile_business = false
  `);
  await db.execute(sql`
    UPDATE businesses
    SET event_location_enabled = true
    WHERE is_mobile_business = true
      AND COALESCE(event_location_enabled, false) = false
  `);

  // FOOD_TRUCK was a type; it is now Restaurant + Mobile Business
  await db.execute(sql`
    UPDATE businesses
    SET
      type = 'FOOD_VENDOR',
      is_mobile_business = true,
      event_location_enabled = true
    WHERE type = 'FOOD_TRUCK'
  `);

  // Split cafe/bakery identity into Coffee Shop (default for prior combined value)
  await db.execute(sql`
    UPDATE businesses
    SET type = 'COFFEE_SHOP'
    WHERE type = 'CAFE_BAKERY'
  `);

  logger.info("Ensured is_mobile_business column and legacy type migration");
}

/** Ensure hours_enabled column exists (hide weekly hours on storefront when false). */
export async function ensureHoursEnabledColumn(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours_enabled boolean NOT NULL DEFAULT true`,
  );
  logger.info("Ensured businesses.hours_enabled column");
}
