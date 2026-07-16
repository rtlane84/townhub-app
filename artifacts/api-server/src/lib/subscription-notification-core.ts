import type { SubscriptionNotificationEvent } from "./email-templates/types";

export type SubscriptionStateSnapshot = {
  status: string;
  planId: number;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  renewalAt: Date | null;
  billingInterval: string | null;
  stripeSubscriptionId: string | null;
};

export type SubscriptionNotifySource =
  | { type: "checkout_completed" }
  | { type: "stripe_sync"; stripeEvent?: string }
  | { type: "subscription_deleted" }
  | { type: "invoice_paid"; billingReason?: string | null }
  | { type: "invoice_payment_failed" }
  | { type: "admin_attach" }
  | { type: "trial_reminder"; daysRemaining: 7 | 1 };

const TRIAL_STATUSES = new Set(["TRIAL", "TRIALING"]);

function isTrialStatus(status: string | null | undefined): boolean {
  return !!status && TRIAL_STATUSES.has(status);
}

function normalizeStatus(status: string): string {
  return status === "TRIALING" ? "TRIAL" : status;
}

export function calendarDaysUntil(target: Date, now = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export function detectSubscriptionNotificationEvents(
  before: SubscriptionStateSnapshot | null,
  after: SubscriptionStateSnapshot,
  source: SubscriptionNotifySource,
): SubscriptionNotificationEvent[] {
  if (source.type === "trial_reminder") {
    if (source.daysRemaining === 7) return ["SUBSCRIPTION_TRIAL_ENDING_7D"];
    if (source.daysRemaining === 1) return ["SUBSCRIPTION_TRIAL_ENDING_1D"];
    return [];
  }

  const events: SubscriptionNotificationEvent[] = [];
  const beforeStatus = before ? normalizeStatus(before.status) : null;
  const afterStatus = normalizeStatus(after.status);
  const becomingTrial = isTrialStatus(afterStatus) && !isTrialStatus(beforeStatus);
  const becomingActiveFromTrial = afterStatus === "ACTIVE" && isTrialStatus(beforeStatus);
  const becomingPastDue = afterStatus === "PAST_DUE" && beforeStatus !== "PAST_DUE";
  const becomingCanceled = afterStatus === "CANCELED" && beforeStatus !== "CANCELED";
  const becomingSuspendedFromPastDue = afterStatus === "SUSPENDED" && beforeStatus === "PAST_DUE";

  if (source.type === "checkout_completed") {
    events.push("SUBSCRIPTION_WELCOME");
    return events;
  }

  if (source.type === "admin_attach") {
    events.push("SUBSCRIPTION_WELCOME");
    return events;
  }

  const becomingCancelScheduled =
    after.cancelAtPeriodEnd && !before?.cancelAtPeriodEnd && afterStatus !== "CANCELED";

  if (becomingCancelScheduled) {
    events.push("SUBSCRIPTION_CANCEL_SCHEDULED");
  }

  // INCOMPLETE → trial is owned by checkout_completed SUBSCRIPTION_WELCOME. Emitting
  // TRIAL_STARTED here races with that webhook and double-emails the owner.
  if (becomingTrial && beforeStatus !== "INCOMPLETE") {
    events.push("SUBSCRIPTION_TRIAL_STARTED");
  }

  if (becomingActiveFromTrial) {
    events.push("SUBSCRIPTION_ACTIVATED");
  }

  if (source.type === "invoice_paid" && source.billingReason === "subscription_cycle" && !becomingActiveFromTrial) {
    events.push("SUBSCRIPTION_PAYMENT_SUCCEEDED");
  }

  if (source.type === "invoice_payment_failed" || becomingPastDue) {
    events.push("SUBSCRIPTION_PAYMENT_FAILED");
  }

  if (becomingCanceled || source.type === "subscription_deleted") {
    if (beforeStatus === "PAST_DUE") {
      events.push("SUBSCRIPTION_EXPIRED");
    } else if (!before?.cancelAtPeriodEnd) {
      events.push("SUBSCRIPTION_CANCELED");
    } else {
      // Scheduled cancellation reached period end — subscription ended normally.
      events.push("SUBSCRIPTION_CANCELED");
    }
  }

  if (becomingSuspendedFromPastDue) {
    events.push("SUBSCRIPTION_EXPIRED");
  }

  // First Stripe subscription without checkout metadata (rare) — welcome once deduped downstream.
  // Skip when before was INCOMPLETE: paid checkout activation is owned by checkout_completed.
  if (
    beforeStatus !== "INCOMPLETE" &&
    !before?.stripeSubscriptionId &&
    after.stripeSubscriptionId &&
    ["ACTIVE", "TRIAL"].includes(afterStatus) &&
    source.type === "stripe_sync" &&
    source.stripeEvent === "customer.subscription.created"
  ) {
    events.push("SUBSCRIPTION_WELCOME");
  }

  return dedupeEvents(events);
}

function dedupeEvents(events: SubscriptionNotificationEvent[]): SubscriptionNotificationEvent[] {
  return [...new Set(events)];
}

export function shouldSkipTrialStartedEmail(input: {
  event: SubscriptionNotificationEvent;
  source: SubscriptionNotifySource;
  welcomeInBatch: boolean;
  welcomeAlreadySent: boolean;
}): boolean {
  if (input.event !== "SUBSCRIPTION_TRIAL_STARTED") return false;
  if (input.welcomeInBatch || input.welcomeAlreadySent) return true;
  if (input.source.type === "checkout_completed" || input.source.type === "admin_attach") return true;
  if (
    input.source.type === "stripe_sync" &&
    input.source.stripeEvent === "customer.subscription.created"
  ) {
    return true;
  }
  return false;
}

export function shouldDedupeSubscriptionEvent(event: SubscriptionNotificationEvent): boolean {
  return event !== "SUBSCRIPTION_PAYMENT_SUCCEEDED";
}

export function mapOwnerEventToAdminEvent(
  ownerEvent: SubscriptionNotificationEvent,
  snapshot: SubscriptionStateSnapshot,
): import("./email-templates/types").PlatformAdminSubscriptionEvent | null {
  switch (ownerEvent) {
    case "SUBSCRIPTION_WELCOME":
      return isTrialStatus(normalizeStatus(snapshot.status))
        ? "ADMIN_TRIAL_STARTED"
        : "ADMIN_SUBSCRIPTION_PAID_STARTED";
    case "SUBSCRIPTION_ACTIVATED":
      return "ADMIN_SUBSCRIPTION_PAID_STARTED";
    case "SUBSCRIPTION_PAYMENT_FAILED":
      return "ADMIN_PAYMENT_FAILED";
    case "SUBSCRIPTION_CANCELED":
      return "ADMIN_SUBSCRIPTION_CANCELED";
    case "SUBSCRIPTION_EXPIRED":
      return "ADMIN_SUBSCRIPTION_EXPIRED";
    default:
      return null;
  }
}

export function subscriptionStatusLabel(status: string, trialEndsAt?: Date | null): string {
  const normalized = normalizeStatus(status);
  if (normalized === "TRIAL") return "Trial";
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "PAST_DUE") return "Past due";
  if (normalized === "CANCELED") return "Canceled";
  if (normalized === "INCOMPLETE") return "Incomplete";
  if (normalized === "BETA") return "Beta";
  if (normalized === "SUSPENDED") return "Suspended";
  if (trialEndsAt && trialEndsAt.getTime() > Date.now()) return "Trial";
  return status.replace(/_/g, " ");
}

export function formatSubscriptionPriceLabel(input: {
  monthlyPrice: number;
  yearlyPrice?: number | null;
  billingInterval?: string | null;
}): string {
  const yearly = input.yearlyPrice ?? 0;
  if (input.billingInterval === "yearly" && yearly > 0) {
    return `$${yearly.toFixed(2)}/year`;
  }
  if (input.monthlyPrice <= 0 && yearly <= 0) return "Complimentary";
  return `$${input.monthlyPrice.toFixed(2)}/month`;
}

export function subscriptionAccessEndDate(snapshot: SubscriptionStateSnapshot): Date | null {
  return snapshot.currentPeriodEnd ?? snapshot.renewalAt ?? snapshot.trialEndsAt;
}

export function snapshotFromSubscriptionRow(row: {
  status: string;
  planId: number;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  renewalAt: Date | null;
  billingInterval: string | null;
  stripeSubscriptionId: string | null;
}): SubscriptionStateSnapshot {
  return {
    status: row.status,
    planId: row.planId,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd,
    renewalAt: row.renewalAt,
    billingInterval: row.billingInterval,
    stripeSubscriptionId: row.stripeSubscriptionId,
  };
}

export function snapshotFromSyncInput(input: {
  status: string;
  planId: number;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd: Date | null;
  billingInterval: string | null;
  stripeSubscriptionId: string;
}): SubscriptionStateSnapshot {
  return {
    status: input.status,
    planId: input.planId,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    trialEndsAt: input.trialEndsAt,
    currentPeriodEnd: input.currentPeriodEnd,
    renewalAt: input.trialEndsAt ?? input.currentPeriodEnd,
    billingInterval: input.billingInterval,
    stripeSubscriptionId: input.stripeSubscriptionId,
  };
}
