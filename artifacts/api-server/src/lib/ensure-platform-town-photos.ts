import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/**
 * Ensure town_photos JSONB column exists. Schema is normally applied via
 * `pnpm --filter @workspace/db run push`; this keeps local/dev DBs from
 * failing theme reads/writes when push hasn't been run yet.
 */
export async function ensurePlatformTownPhotosColumn(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS town_photos jsonb NOT NULL DEFAULT '[]'::jsonb`,
  );
  await db.execute(
    sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS show_hero_overlay boolean NOT NULL DEFAULT true`,
  );
  logger.info(
    "Ensured platform_settings town_photos and show_hero_overlay columns",
  );
}
