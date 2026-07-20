import {
  db,
  subscriptionFeaturesTable,
  planFeaturesTable,
  businessSubscriptionsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  DEFAULT_SUBSCRIPTION_FEATURES,
  subscriptionGrantsFeaturesForPlan,
  type SubscriptionFeatureKey,
} from "./subscription-feature-keys";
import { serializeSubscriptionFeature } from "./subscription-serializers";
import { isComplimentaryPlan } from "./stripe-billing";
import { findPlanById } from "./subscription-plans";

export type SerializedSubscriptionFeature = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
};

/** Idempotently ensure the default feature catalog exists. */
export async function ensureDefaultSubscriptionFeatures(): Promise<void> {
  // Rename legacy food_truck_tracking → mobile_business (same row / plan links)
  await db.execute(
    sql`
      UPDATE subscription_features
      SET
        key = 'mobile_business',
        name = 'Mobile Business',
        description = 'Publish a daily and upcoming location schedule for traveling or pop-up businesses.'
      WHERE key = 'food_truck_tracking'
    `,
  ).catch(() => undefined);

  for (const feature of DEFAULT_SUBSCRIPTION_FEATURES) {
    const [existing] = await db
      .select({ id: subscriptionFeaturesTable.id })
      .from(subscriptionFeaturesTable)
      .where(eq(subscriptionFeaturesTable.key, feature.key));

    if (existing) {
      await db
        .update(subscriptionFeaturesTable)
        .set({
          name: feature.name,
          description: feature.description,
          category: feature.category,
          sortOrder: feature.sortOrder,
        })
        .where(eq(subscriptionFeaturesTable.id, existing.id));
      continue;
    }

    await db.insert(subscriptionFeaturesTable).values({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      sortOrder: feature.sortOrder,
      isActive: true,
    });
  }
}

export async function listActiveFeatureKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ key: subscriptionFeaturesTable.key })
    .from(subscriptionFeaturesTable)
    .where(eq(subscriptionFeaturesTable.isActive, true));
  return new Set(rows.map((row) => row.key));
}

export async function getPlanFeatureKeys(planId: number): Promise<Set<string>> {
  const rows = await db
    .select({ key: subscriptionFeaturesTable.key })
    .from(planFeaturesTable)
    .innerJoin(
      subscriptionFeaturesTable,
      eq(planFeaturesTable.featureId, subscriptionFeaturesTable.id),
    )
    .where(
      and(
        eq(planFeaturesTable.planId, planId),
        eq(subscriptionFeaturesTable.isActive, true),
      ),
    );
  return new Set(rows.map((row) => row.key));
}

export async function getPlanFeatures(planId: number): Promise<SerializedSubscriptionFeature[]> {
  const rows = await db
    .select({ feature: subscriptionFeaturesTable })
    .from(planFeaturesTable)
    .innerJoin(
      subscriptionFeaturesTable,
      eq(planFeaturesTable.featureId, subscriptionFeaturesTable.id),
    )
    .where(eq(planFeaturesTable.planId, planId))
    .orderBy(subscriptionFeaturesTable.sortOrder, subscriptionFeaturesTable.name);

  return rows.map((row) => serializeSubscriptionFeature(row.feature));
}

/**
 * Single source of truth for which features a business may use.
 *
 * Strict entitlement rules (required for Presence vs Orders packaging):
 * - No subscription row → no features
 * - Restricted subscription status (paid) → no features
 * - Plan with zero mapped features → no features (admins must map plan_features explicitly)
 */
export async function getBusinessFeatureKeys(businessId: number): Promise<Set<string>> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  if (!subscription) {
    return new Set();
  }

  const plan = await findPlanById(subscription.planId);
  const complimentary = plan ? isComplimentaryPlan(plan) : false;

  if (!subscriptionGrantsFeaturesForPlan(subscription.status, complimentary)) {
    return new Set();
  }

  return getPlanFeatureKeys(subscription.planId);
}

/** Batch online_ordering entitlement for public business payloads. */
export async function mapBusinessesHaveFeature(
  businessIds: number[],
  featureKey: SubscriptionFeatureKey | string,
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>();
  const uniqueIds = [...new Set(businessIds.filter((id) => Number.isFinite(id)))];
  for (const id of uniqueIds) {
    result.set(id, false);
  }
  if (uniqueIds.length === 0) return result;

  await Promise.all(
    uniqueIds.map(async (businessId) => {
      result.set(businessId, await businessHasFeature(businessId, featureKey));
    }),
  );
  return result;
}

export async function businessHasFeature(
  businessId: number,
  featureKey: SubscriptionFeatureKey | string,
): Promise<boolean> {
  const keys = await getBusinessFeatureKeys(businessId);
  return keys.has(featureKey);
}

export type BusinessFeatureAccessEntry = {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
};

export type BusinessFeatureAccessReport = {
  bypassRestrictions: boolean;
  planName: string | null;
  features: BusinessFeatureAccessEntry[];
};

/** Owner-facing feature access report for subscription-aware UI. */
export async function buildBusinessFeatureAccessReport(
  businessId: number,
  bypassRestrictions: boolean,
): Promise<BusinessFeatureAccessReport> {
  await ensureDefaultSubscriptionFeatures();

  const enabledKeys = bypassRestrictions
    ? await listActiveFeatureKeys()
    : await getBusinessFeatureKeys(businessId);

  const catalog = await db
    .select()
    .from(subscriptionFeaturesTable)
    .where(eq(subscriptionFeaturesTable.isActive, true))
    .orderBy(asc(subscriptionFeaturesTable.sortOrder), asc(subscriptionFeaturesTable.name));

  const [subscription] = await db
    .select({ planId: businessSubscriptionsTable.planId })
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  let planName: string | null = null;
  if (subscription) {
    const [plan] = await db
      .select({ name: subscriptionPlansTable.name })
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, subscription.planId));
    planName = plan?.name ?? null;
  }

  return {
    bypassRestrictions,
    planName,
    features: catalog.map((feature) => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      enabled: enabledKeys.has(feature.key),
    })),
  };
}

export async function setPlanFeatures(planId: number, featureIds: number[]): Promise<void> {
  const [plan] = await db
    .select({ id: subscriptionPlansTable.id })
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.id, planId));

  if (!plan) {
    throw new Error("Plan not found");
  }

  if (featureIds.length > 0) {
    const rows = await db
      .select({ id: subscriptionFeaturesTable.id })
      .from(subscriptionFeaturesTable)
      .where(inArray(subscriptionFeaturesTable.id, featureIds));

    if (rows.length !== featureIds.length) {
      throw new Error("One or more features were not found");
    }
  }

  await db.delete(planFeaturesTable).where(eq(planFeaturesTable.planId, planId));

  if (featureIds.length === 0) return;

  await db.insert(planFeaturesTable).values(
    featureIds.map((featureId) => ({ planId, featureId })),
  );
}
