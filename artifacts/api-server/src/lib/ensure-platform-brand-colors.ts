import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/**
 * Ensure wordmark color columns exist. Schema is normally applied via
 * `pnpm --filter @workspace/db run push`; this keeps local/dev DBs from
 * silently dropping Clay/Town/Hub color saves when push hasn't been run yet.
 */
export async function ensurePlatformBrandWordColorColumns(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS brand_prefix_color text`,
  );
  await db.execute(
    sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS brand_town_color text`,
  );
  await db.execute(
    sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS brand_hub_color text`,
  );
  logger.info("Ensured platform_settings brand wordmark color columns");
}
