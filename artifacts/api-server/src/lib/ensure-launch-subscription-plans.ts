import { and, eq, ilike } from "drizzle-orm";
import {
  db,
  planFeaturesTable,
  subscriptionFeaturesTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { ensureDefaultSubscriptionFeatures } from "./business-features";
import { SUBSCRIPTION_FEATURE_KEYS } from "./subscription-feature-keys";

/** Clay launch packaging — admin can rename later; keys below drive feature maps. */
export const LAUNCH_PLAN_PRESENCE_NAME = "Presence";
export const LAUNCH_PLAN_ORDERS_NAME = "Orders";

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
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  trialDays: number;
  isDefault: boolean;
  isRecommended: boolean;
  sortOrder: number;
  featureKeys: readonly string[];
}): Promise<{ planId: number; created: boolean }> {
  const [existing] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(ilike(subscriptionPlansTable.name, input.name))
    .limit(1);

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
 * Idempotently create/update Clay launch Presence ($25) and Orders ($40) plans
 * with explicit feature mappings. Does not set Stripe price IDs — paste those in Admin.
 */
export async function ensureLaunchSubscriptionPlans(): Promise<{
  presencePlanId: number;
  ordersPlanId: number;
  presenceCreated: boolean;
  ordersCreated: boolean;
}> {
  await ensureDefaultSubscriptionFeatures();

  const presence = await upsertLaunchPlan({
    name: LAUNCH_PLAN_PRESENCE_NAME,
    description:
      "Business page with hours, photos, and menu or services. Customers browse — no online cart. Includes appointments and mobile location schedule when you need them.",
    monthlyPrice: "25.00",
    yearlyPrice: "250.00",
    trialDays: 30,
    isDefault: true,
    isRecommended: false,
    sortOrder: 10,
    featureKeys: PRESENCE_FEATURE_KEYS,
  });

  const orders = await upsertLaunchPlan({
    name: LAUNCH_PLAN_ORDERS_NAME,
    description:
      "Everything in Presence, plus online ordering, order management, and SMS alerts.",
    monthlyPrice: "40.00",
    yearlyPrice: "400.00",
    trialDays: 30,
    isDefault: false,
    isRecommended: true,
    sortOrder: 20,
    featureKeys: ORDERS_FEATURE_KEYS,
  });

  return {
    presencePlanId: presence.planId,
    ordersPlanId: orders.planId,
    presenceCreated: presence.created,
    ordersCreated: orders.created,
  };
}
