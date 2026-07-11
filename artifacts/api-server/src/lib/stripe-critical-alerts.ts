/**
 * Helpers for mandatory Stripe / payment critical alerts.
 * These are not user-toggleable and are not gated by operational channel Enable flags.
 */

import type { StripeConnectPaymentStatus } from "./stripe-connect-status";

export type StripeCriticalIssueKind =
  | "refund_failed"
  | "account_disconnected"
  | "charges_disabled"
  | "payouts_disabled"
  | "verification_required"
  | "account_restricted"
  | "payments_unavailable";

export type StripeConnectIssueDetails = {
  kind: Exclude<StripeCriticalIssueKind, "refund_failed">;
  headline: string;
  detail: string;
};

/** Connect statuses that should show a persistent Business Hub warning. */
export function isUnresolvedStripeConnectIssue(
  status: string | null | undefined,
  connectedAccountId?: string | null,
): boolean {
  if (status === "restricted") return true;
  if (status === "pending" && Boolean(connectedAccountId?.trim())) return true;
  return false;
}

export function describeStripeConnectIssue(input: {
  paymentStatus: StripeConnectPaymentStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDueCount: number;
  connectedAccountId: string | null;
  previousStatus?: string | null;
}): StripeConnectIssueDetails | null {
  const { paymentStatus, connectedAccountId, previousStatus } = input;

  if (
    paymentStatus === "not_connected" &&
    (previousStatus === "connected" || previousStatus === "pending" || previousStatus === "restricted")
  ) {
    return {
      kind: "account_disconnected",
      headline: "Stripe account disconnected",
      detail: "Your Stripe account is no longer connected. Online card payments and payouts will not work until you reconnect.",
    };
  }

  if (paymentStatus === "restricted") {
    if (input.requirementsCurrentlyDueCount > 0 || !input.detailsSubmitted) {
      return {
        kind: "account_restricted",
        headline: "Stripe needs more information",
        detail: "Stripe has restricted this account. Complete verification in Settings so payments and payouts can resume.",
      };
    }
    if (!input.chargesEnabled) {
      return {
        kind: "charges_disabled",
        headline: "Card charges are disabled",
        detail: "Stripe has disabled charges on this account. Customers cannot pay online until this is fixed.",
      };
    }
    if (!input.payoutsEnabled) {
      return {
        kind: "payouts_disabled",
        headline: "Payouts are disabled",
        detail: "Stripe has disabled payouts on this account. Fix the issue in Settings to receive funds.",
      };
    }
    return {
      kind: "account_restricted",
      headline: "Stripe account restricted",
      detail: "Stripe has restricted this account. Review your payment settings to restore normal operation.",
    };
  }

  if (paymentStatus === "pending" && connectedAccountId) {
    if (input.requirementsCurrentlyDueCount > 0 || !input.detailsSubmitted) {
      return {
        kind: "verification_required",
        headline: "Stripe verification required",
        detail: "Finish Stripe setup and verification so customers can pay online and you can receive payouts.",
      };
    }
    if (!input.chargesEnabled) {
      return {
        kind: "charges_disabled",
        headline: "Card charges are not enabled yet",
        detail: "Stripe has not enabled charges for this account. Complete setup in Settings.",
      };
    }
    if (!input.payoutsEnabled) {
      return {
        kind: "payouts_disabled",
        headline: "Payouts are not enabled yet",
        detail: "Stripe has not enabled payouts for this account. Complete setup in Settings.",
      };
    }
    return {
      kind: "payments_unavailable",
      headline: "Online payments unavailable",
      detail: "Your Stripe account is still setting up. Online payments may not work until setup is complete.",
    };
  }

  return null;
}

/** Whether a status transition should fire a critical owner alert. */
export function shouldNotifyStripeConnectTransition(
  previousStatus: string | null | undefined,
  nextStatus: StripeConnectPaymentStatus,
  connectedAccountId: string | null,
): boolean {
  const nextCritical = isUnresolvedStripeConnectIssue(nextStatus, connectedAccountId);
  const prevCritical = isUnresolvedStripeConnectIssue(previousStatus, connectedAccountId);
  if (nextStatus === "not_connected") {
    return previousStatus === "connected" || previousStatus === "pending" || previousStatus === "restricted";
  }
  if (!nextCritical) return false;
  // First time entering a critical state, or changing between critical states.
  return !prevCritical || previousStatus !== nextStatus;
}

export function hubBannerCopyForConnectStatus(status: string | null | undefined): {
  title: string;
  description: string;
} | null {
  if (status === "restricted") {
    return {
      title: "Stripe account needs attention",
      description:
        "Payments or payouts may be blocked. Open Settings to review and fix your Stripe account.",
    };
  }
  if (status === "pending") {
    return {
      title: "Finish Stripe setup",
      description:
        "Verification or account setup is incomplete. Online payments may not work until this is resolved.",
    };
  }
  return null;
}
