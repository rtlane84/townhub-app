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

/** Ensure newer business_type enum values exist for directory categories. */
export async function ensureBusinessTypeEnumValues(): Promise<void> {
  for (const value of ["FOOD_TRUCK", "CAFE_BAKERY", "GROCERY"] as const) {
    await db.execute(
      sql.raw(`ALTER TYPE business_type ADD VALUE IF NOT EXISTS '${value}'`),
    );
  }
  logger.info("Ensured business_type enum values for new categories");
}
