import { and, eq, ilike } from "drizzle-orm";
import {
  db,
  planFeaturesTable,
  subscriptionFeaturesTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { ensureDefaultSubscriptionFeatures } from "./business-features";
import { SUBSCRIPTION_FEATURE_KEYS } from "./subscription-feature-keys";

/** Clay launch packaging — keys below drive feature maps. */
export const LAUNCH_PLAN_SHOWCASE_NAME = "Business Showcase";
export const LAUNCH_PLAN_ORDERING_NAME = "Business Ordering";

const LEGACY_SHOWCASE_PLAN_NAMES = ["Presence"];
const LEGACY_ORDERING_PLAN_NAMES = ["Orders"];

const PRESENCE_FEATURE_KEYS = [
  SUBSCRIPTION_FEATURE_KEYS.BUSINESS_WEBSITE,
  SUBSCRIPTION_FEATURE_KEYS.APPOINTMENT_REQUESTS,
  SUBSCRIPTION_FEATURE_KEYS.MOBILE_BUSINESS,
  SUBSCRIPTION_FEATURE_KEYS.EMAIL_NOTIFICATIONS,
  SUBSCRIPTION_FEATURE_KEYS.ANALYTICS,
] as const;

const ORDERS_FEATURE_KEYS = [
  ...PRESENCE_FEATURE_KEYS,
  SUBSCRIPTION_FEATURE_KEYS.ONLINE_ORDERING,
  SUBSCRIPTION_FEATURE_KEYS.SMS_NOTIFICATIONS,
] as const;

async function featureIdsForKeys(keys: readonly string[]): Promise<number[]> {
  const rows = await db
    .select({ id: subscriptionFeaturesTable.id, key: subscriptionFeaturesTable.key })
    .from(subscriptionFeaturesTable)
    .where(eq(subscriptionFeaturesTable.isActive, true));

  const byKey = new Map(rows.map((row) => [row.key, row.id]));
  const ids: number[] = [];
  for (const key of keys) {
    const id = byKey.get(key);
    if (id == null) {
      throw new Error(`Missing subscription feature catalog key: ${key}`);
    }
    ids.push(id);
  }
  return ids;
}

async function upsertLaunchPlan(input: {
  name: string;
  legacyNames: readonly string[];
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  trialDays: number;
  isDefault: boolean;
  isRecommended: boolean;
  sortOrder: number;
  featureKeys: readonly string[];
}): Promise<{ planId: number; created: boolean }> {
  let existing: typeof subscriptionPlansTable.$inferSelect | undefined;
  for (const candidateName of [input.name, ...input.legacyNames]) {
    const [candidate] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(ilike(subscriptionPlansTable.name, candidateName))
      .limit(1);
    if (candidate) {
      existing = candidate;
      break;
    }
  }

  let planId: number;
  let created = false;

  if (existing) {
    planId = existing.id;
    await db
      .update(subscriptionPlansTable)
      .set({
        name: input.name,
        description: input.description,
        monthlyPrice: input.monthlyPrice,
        yearlyPrice: input.yearlyPrice,
        setupFee: "0",
        transactionFeePercent: "0",
        trialDays: input.trialDays,
        isActive: true,
        isPublic: true,
        isDefault: input.isDefault,
        isRecommended: input.isRecommended,
        isBeta: false,
        sortOrder: input.sortOrder,
      })
      .where(eq(subscriptionPlansTable.id, planId));
  } else {
    const [createdPlan] = await db
      .insert(subscriptionPlansTable)
      .values({
        name: input.name,
        description: input.description,
        monthlyPrice: input.monthlyPrice,
        yearlyPrice: input.yearlyPrice,
        setupFee: "0",
        transactionFeePercent: "0",
        trialDays: input.trialDays,
        isActive: true,
        isPublic: true,
        isDefault: input.isDefault,
        isRecommended: input.isRecommended,
        isBeta: false,
        sortOrder: input.sortOrder,
      })
      .returning();
    planId = createdPlan.id;
    created = true;
  }

  if (input.isDefault) {
    await db
      .update(subscriptionPlansTable)
      .set({ isDefault: false })
      .where(and(eq(subscriptionPlansTable.isDefault, true)));
    await db
      .update(subscriptionPlansTable)
      .set({ isDefault: true })
      .where(eq(subscriptionPlansTable.id, planId));
  }

  const featureIds = await featureIdsForKeys(input.featureKeys);
  await db.delete(planFeaturesTable).where(eq(planFeaturesTable.planId, planId));
  if (featureIds.length > 0) {
    await db.insert(planFeaturesTable).values(
      featureIds.map((featureId) => ({ planId, featureId })),
    );
  }

  return { planId, created };
}

/**
 * Idempotently create/update Clay launch Business Showcase ($20) and
 * Business Ordering ($40) plans. Legacy Presence/Orders records are renamed in
 * place so active subscriptions keep their existing plan IDs.
 * with explicit feature mappings. Does not set Stripe price IDs — paste those in Admin.
 */
export async function ensureLaunchSubscriptionPlans(): Promise<{
  showcasePlanId: number;
  orderingPlanId: number;
  showcaseCreated: boolean;
  orderingCreated: boolean;
}> {
  await ensureDefaultSubscriptionFeatures();

  const showcase = await upsertLaunchPlan({
    name: LAUNCH_PLAN_SHOWCASE_NAME,
    legacyNames: LEGACY_SHOWCASE_PLAN_NAMES,
    description:
      "Create a public TownHub page with your hours, photos, products, menu, or services. Customers can browse, call, or request an appointment. Online ordering is not included.",
    monthlyPrice: "20.00",
    yearlyPrice: "200.00",
    trialDays: 14,
    isDefault: true,
    isRecommended: false,
    sortOrder: 10,
    featureKeys: PRESENCE_FEATURE_KEYS,
  });

  const ordering = await upsertLaunchPlan({
    name: LAUNCH_PLAN_ORDERING_NAME,
    legacyNames: LEGACY_ORDERING_PLAN_NAMES,
    description:
      "Everything in Business Showcase, plus online ordering and order management. Customers can place pickup or delivery orders; you run them from your dashboard.",
    monthlyPrice: "40.00",
    yearlyPrice: "400.00",
    trialDays: 14,
    isDefault: false,
    isRecommended: true,
    sortOrder: 20,
    featureKeys: ORDERS_FEATURE_KEYS,
  });

  return {
    showcasePlanId: showcase.planId,
    orderingPlanId: ordering.planId,
    showcaseCreated: showcase.created,
    orderingCreated: ordering.created,
  };
}
