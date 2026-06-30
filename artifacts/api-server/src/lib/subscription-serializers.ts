import type {
  businessSubscriptionsTable,
  subscriptionFeaturesTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { normalizeSubscriptionStatus } from "./subscription-feature-keys";

export function parseNumeric(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyPrice: parseFloat(p.monthlyPrice),
    yearlyPrice: parseNumeric(p.yearlyPrice),
    setupFee: parseNumeric(p.setupFee),
    transactionFeePercent: parseNumeric(p.transactionFeePercent),
    trialDays: p.trialDays,
    isActive: p.isActive,
    isDefault: p.isDefault,
    isPublic: p.isPublic,
    isRecommended: p.isRecommended,
    isBeta: p.isBeta,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
  };
}

export function serializeSubscription(
  s: typeof businessSubscriptionsTable.$inferSelect,
  plan?: typeof subscriptionPlansTable.$inferSelect,
  features: ReturnType<typeof serializeSubscriptionFeature>[] = [],
) {
  return {
    id: s.id,
    businessId: s.businessId,
    planId: s.planId,
    status: normalizeSubscriptionStatus(s.status) as typeof s.status,
    startedAt: s.startedAt,
    renewalAt: s.renewalAt,
    trialEndsAt: s.trialEndsAt,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    notes: s.notes,
    stripeSubscriptionId: s.stripeSubscriptionId,
    plan: plan ? serializePlan(plan) : undefined,
    features,
    createdAt: s.createdAt,
  };
}

export function serializeSubscriptionFeature(
  row: typeof subscriptionFeaturesTable.$inferSelect,
) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function serializePublicPricingPlan(
  plan: ReturnType<typeof serializePlan>,
  features: ReturnType<typeof serializeSubscriptionFeature>[],
) {
  return {
    ...plan,
    features: features.map((feature) => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
    })),
  };
}
