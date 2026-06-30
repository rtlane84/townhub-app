import {
  db,
  subscriptionFeaturesTable,
  planFeaturesTable,
  businessSubscriptionsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { and, asc, eq, inArray } from "drizzle-orm";
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
  for (const feature of DEFAULT_SUBSCRIPTION_FEATURES) {
    const [existing] = await db
      .select({ id: subscriptionFeaturesTable.id })
      .from(subscriptionFeaturesTable)
      .where(eq(subscriptionFeaturesTable.key, feature.key));

    if (existing) continue;

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
 * When a plan has no mapped features yet, all active catalog features are allowed
 * so existing deployments keep working until an admin configures mappings.
 */
export async function getBusinessFeatureKeys(businessId: number): Promise<Set<string>> {
  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  if (!subscription) {
    return listActiveFeatureKeys();
  }

  const plan = await findPlanById(subscription.planId);
  const complimentary = plan ? isComplimentaryPlan(plan) : false;

  if (!subscriptionGrantsFeaturesForPlan(subscription.status, complimentary)) {
    return new Set();
  }

  const planKeys = await getPlanFeatureKeys(subscription.planId);
  if (planKeys.size === 0) {
    return listActiveFeatureKeys();
  }

  return planKeys;
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
