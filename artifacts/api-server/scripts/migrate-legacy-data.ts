#!/usr/bin/env node
/**
 * Explicit one-time legacy data maintenance. Never runs during API startup.
 *
 * Usage (after a backup and reviewed schema push):
 *   CONFIRM_LEGACY_DATA_MIGRATION=1 pnpm --filter @workspace/api-server run migrate-legacy-data
 */
import { migrateLegacyProductOptionsToModifierGroups } from "@workspace/db/migrate-legacy-product-options";
import { migrateLegacyBusinessTypes } from "@workspace/db/migrate-legacy-business-types";

async function main(): Promise<void> {
  if (process.env.CONFIRM_LEGACY_DATA_MIGRATION !== "1") {
    throw new Error("Set CONFIRM_LEGACY_DATA_MIGRATION=1 after backup and target verification.");
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LEGACY_DATA_MIGRATION !== "1") {
    throw new Error("Production requires ALLOW_LEGACY_DATA_MIGRATION=1 in addition to confirmation.");
  }

  const businessTypes = await migrateLegacyBusinessTypes();
  await migrateLegacyProductOptionsToModifierGroups();
  console.log(JSON.stringify({ ok: true, businessTypes }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
