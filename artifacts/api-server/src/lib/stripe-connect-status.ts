import type Stripe from "stripe";
import { getStripeKeyMode } from "./stripe-config";

export type StripeConnectPaymentStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "restricted";

export type StripeConnectStatusSnapshot = {
  paymentStatus: StripeConnectPaymentStatus;
  connectedAccountId: string | null;
  connectedAccountLabel: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDueCount: number;
  mode: "mock" | "test" | "live" | "unknown";
  onlinePaymentsAvailable: boolean;
};

export function maskStripeAccountId(accountId: string): string {
  if (accountId.length <= 12) return accountId;
  return `${accountId.slice(0, 8)}…${accountId.slice(-4)}`;
}

export function deriveConnectPaymentStatus(
  account: Stripe.Account | null,
  connectedAccountId: string | null,
): StripeConnectPaymentStatus {
  if (!connectedAccountId) return "not_connected";
  if (!account) return "pending";

  const disabledReason = account.requirements?.disabled_reason;
  if (disabledReason) return "restricted";

  if (!account.details_submitted || !account.charges_enabled) {
    return "pending";
  }

  // Charges work but payouts do not — treat as restricted so owners get critical alerts.
  if (!account.payouts_enabled) {
    return "restricted";
  }

  return "connected";
}

export function connectStatusFromAccount(
  account: Stripe.Account | null,
  connectedAccountId: string | null,
): StripeConnectStatusSnapshot {
  const mode = getStripeKeyMode(process.env.STRIPE_SECRET_KEY);
  const paymentStatus = deriveConnectPaymentStatus(account, connectedAccountId);

  return {
    paymentStatus,
    connectedAccountId: connectedAccountId ? maskStripeAccountId(connectedAccountId) : null,
    connectedAccountLabel: connectedAccountId ? maskStripeAccountId(connectedAccountId) : null,
    chargesEnabled: account?.charges_enabled ?? false,
    payoutsEnabled: account?.payouts_enabled ?? false,
    detailsSubmitted: account?.details_submitted ?? false,
    requirementsCurrentlyDueCount: account?.requirements?.currently_due?.length ?? 0,
    mode,
    onlinePaymentsAvailable: paymentStatus === "connected",
  };
}

export function businessHasOnlinePaymentsReady(business: {
  stripeConnectStatus?: string | null;
  stripeConnectedAccountId?: string | null;
}): boolean {
  return business.stripeConnectStatus === "connected" && Boolean(business.stripeConnectedAccountId);
}
