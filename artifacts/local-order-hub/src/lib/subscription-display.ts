export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  BETA: "Beta",
  TRIAL: "Trial",
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
  SUSPENDED: "Suspended",
  PAUSED: "Suspended",
};

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatPlanAmount(price: number, interval: "month" | "year" = "month"): string {
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}/${interval === "year" ? "yr" : "mo"}`;
}
