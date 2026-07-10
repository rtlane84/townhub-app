import app from "./app";
import { logger } from "./lib/logger";
import { migrateLegacyProductOptionsToModifierGroups } from "@workspace/db/migrate-legacy-product-options";
import { ensureDefaultSubscriptionFeatures } from "./lib/business-features";
import { ensurePlatformBrandWordColorColumns } from "./lib/ensure-platform-brand-colors";
import {
  ensureBusinessTypeEnumValues,
  ensureDeliveryBufferMinutesColumn,
  ensureHoursEnabledColumn,
  ensureMobileBusinessSchema,
} from "./lib/ensure-business-fulfillment-schema";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  try {
    await ensurePlatformBrandWordColorColumns();
  } catch (bootstrapErr) {
    logger.warn({ err: bootstrapErr }, "Platform brand wordmark color columns bootstrap skipped");
  }

  try {
    await ensureBusinessTypeEnumValues();
    await ensureDeliveryBufferMinutesColumn();
    await ensureMobileBusinessSchema();
    await ensureHoursEnabledColumn();
  } catch (bootstrapErr) {
    logger.warn({ err: bootstrapErr }, "Business fulfillment schema bootstrap skipped");
  }

  try {
    await ensureDefaultSubscriptionFeatures();
  } catch (bootstrapErr) {
    logger.warn({ err: bootstrapErr }, "Subscription feature catalog bootstrap skipped");
  }

  try {
    await migrateLegacyProductOptionsToModifierGroups();
  } catch (migrationErr) {
    logger.warn({ err: migrationErr }, "Legacy product options migration skipped");
  }

  logger.info({ port }, "Server listening");
});
