import { db, subscriptionPlansTable, businessSubscriptionsTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

type Plan = typeof subscriptionPlansTable.$inferSelect;

/** When marking a plan default, clear default on all other plans. */
export async function enforceSingleDefaultPlan(keepPlanId: number): Promise<void> {
  await db
    .update(subscriptionPlansTable)
    .set({ isDefault: false })
    .where(ne(subscriptionPlansTable.id, keepPlanId));
}

/** When marking a plan recommended, clear recommended on all other plans. */
export async function enforceSingleRecommendedPlan(keepPlanId: number): Promise<void> {
  await db
    .update(subscriptionPlansTable)
    .set({ isRecommended: false })
    .where(ne(subscriptionPlansTable.id, keepPlanId));
}

export async function findPlanById(planId: number): Promise<Plan | undefined> {
  const [plan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.id, planId));
  return plan;
}

/** Override > application selection > default active plan. */
export async function resolveApprovalPlan(
  applicationPlanId: number | null,
  overridePlanId?: number,
): Promise<Plan | null> {
  const explicitId = overridePlanId ?? applicationPlanId ?? null;
  if (explicitId) {
    const plan = await findPlanById(explicitId);
    return plan ?? null;
  }

  const [defaultPlan] = await db
    .select()
    .from(subscriptionPlansTable)
    .where(and(eq(subscriptionPlansTable.isDefault, true), eq(subscriptionPlansTable.isActive, true)));

  return defaultPlan ?? null;
}

export async function attachPlanToBusiness(
  businessId: number,
  plan: Plan,
  options?: { billingInterval?: "monthly" | "yearly" | null },
): Promise<void> {
  const now = new Date();
  const monthly = parseFloat(plan.monthlyPrice);
  const yearly = plan.yearlyPrice ? parseFloat(plan.yearlyPrice) : 0;
  const complimentary = plan.isBeta || (monthly <= 0 && yearly <= 0);
  const billingInterval = options?.billingInterval ?? "monthly";

  if (!complimentary) {
    await db.insert(businessSubscriptionsTable).values({
      businessId,
      planId: plan.id,
      status: "INCOMPLETE",
      startedAt: now,
      billingInterval,
    });
    return;
  }

  const trialEndsAt =
    plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

  const status = plan.isBeta ? "BETA" : plan.trialDays > 0 ? "TRIAL" : "ACTIVE";

  await db.insert(businessSubscriptionsTable).values({
    businessId,
    planId: plan.id,
    status,
    startedAt: now,
    trialEndsAt,
    renewalAt: trialEndsAt,
    billingInterval: complimentary ? null : billingInterval,
  });
}
