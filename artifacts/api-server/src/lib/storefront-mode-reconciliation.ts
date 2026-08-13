import {
  db,
  businessesTable,
  businessSubscriptionsTable,
} from "@workspace/db";
import {
  coerceEntitledStorefrontMode,
  resolveStorefrontMode,
  type StorefrontMode,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { getBusinessFeatureKeys } from "./business-features";
import { invalidatePublicBusinessDirectoryCache } from "./public-business-directory-cache";
import { SUBSCRIPTION_FEATURE_KEYS } from "./subscription-feature-keys";

export type StorefrontModeReconciliationResult = {
  businessId: number;
  previousMode: StorefrontMode;
  storefrontMode: StorefrontMode;
  changed: boolean;
};

/**
 * Persist display-only mode when the selected commerce mode is no longer entitled.
 * INFORMATION is never promoted automatically after an upgrade.
 */
export async function reconcileBusinessStorefrontMode(
  businessId: number,
): Promise<StorefrontModeReconciliationResult | null> {
  const [business] = await db
    .select({
      id: businessesTable.id,
      type: businessesTable.type,
      storefrontMode: businessesTable.storefrontMode,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) return null;

  const featureKeys = await getBusinessFeatureKeys(businessId);
  const previousMode = resolveStorefrontMode(business);
  const storefrontMode = coerceEntitledStorefrontMode(previousMode, {
    onlineOrderingAllowed: featureKeys.has(SUBSCRIPTION_FEATURE_KEYS.ONLINE_ORDERING),
    appointmentRequestsAllowed: featureKeys.has(
      SUBSCRIPTION_FEATURE_KEYS.APPOINTMENT_REQUESTS,
    ),
  });
  const changed = business.storefrontMode !== storefrontMode;

  if (changed) {
    await db
      .update(businessesTable)
      .set({ storefrontMode })
      .where(eq(businessesTable.id, businessId));
  }

  invalidatePublicBusinessDirectoryCache();
  return { businessId, previousMode, storefrontMode, changed };
}

export async function reconcilePlanBusinessStorefrontModes(
  planId: number,
): Promise<StorefrontModeReconciliationResult[]> {
  const rows = await db
    .select({ businessId: businessSubscriptionsTable.businessId })
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.planId, planId));

  const results = await Promise.all(
    rows.map((row) => reconcileBusinessStorefrontMode(row.businessId)),
  );
  return results.filter(
    (result): result is StorefrontModeReconciliationResult => result !== null,
  );
}

export async function reconcileAllBusinessStorefrontModes(): Promise<
  StorefrontModeReconciliationResult[]
> {
  const rows = await db
    .select({ businessId: businessesTable.id })
    .from(businessesTable);
  const results = await Promise.all(
    rows.map((row) => reconcileBusinessStorefrontMode(row.businessId)),
  );
  return results.filter(
    (result): result is StorefrontModeReconciliationResult => result !== null,
  );
}
