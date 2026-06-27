import type { SubscriptionPlan } from "@workspace/api-client-react";

export function formatPlanPrice(plan: Pick<SubscriptionPlan, "monthlyPrice">): string {
  return plan.monthlyPrice === 0 ? "Free" : `$${plan.monthlyPrice.toFixed(2)}/mo`;
}

export function planAssignmentLabel(plan: SubscriptionPlan): string {
  const badge = !plan.isActive ? (plan.monthlyPrice === 0 ? "Internal" : "Inactive") : null;
  return badge ? `${plan.name} — ${formatPlanPrice(plan)} (${badge})` : `${plan.name} — ${formatPlanPrice(plan)}`;
}
