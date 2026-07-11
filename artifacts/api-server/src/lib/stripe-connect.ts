import { eq } from "drizzle-orm";
import { db, businessesTable, type Business } from "@workspace/db";
import { stripe } from "./stripe";
import {
  deriveConnectPaymentStatus,
  connectStatusFromAccount,
  businessHasOnlinePaymentsReady,
  type StripeConnectStatusSnapshot,
} from "./stripe-connect-status";
import {
  describeStripeConnectIssue,
  shouldNotifyStripeConnectTransition,
} from "./stripe-critical-alerts";

export type {
  StripeConnectPaymentStatus,
  StripeConnectStatusSnapshot,
} from "./stripe-connect-status";

export {
  maskStripeAccountId,
  deriveConnectPaymentStatus,
  connectStatusFromAccount,
  businessHasOnlinePaymentsReady,
} from "./stripe-connect-status";

export async function retrieveConnectAccount(
  connectedAccountId: string,
): Promise<import("stripe").default.Account | null> {
  if (!stripe) return null;
  try {
    return await stripe.accounts.retrieve(connectedAccountId);
  } catch {
    return null;
  }
}

export async function syncBusinessStripeConnectStatus(
  businessId: number,
): Promise<StripeConnectStatusSnapshot> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    return connectStatusFromAccount(null, null);
  }

  const accountId = business.stripeConnectedAccountId?.trim() ?? null;
  if (!accountId) {
    const previousStatus = business.stripeConnectStatus;
    if (business.stripeConnectStatus !== "not_connected") {
      await db
        .update(businessesTable)
        .set({ stripeConnectStatus: "not_connected" })
        .where(eq(businessesTable.id, businessId));
    }
    if (shouldNotifyStripeConnectTransition(previousStatus, "not_connected", null)) {
      const issue = describeStripeConnectIssue({
        paymentStatus: "not_connected",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsCurrentlyDueCount: 0,
        connectedAccountId: null,
        previousStatus,
      });
      if (issue) {
        const { notifyOwnerStripeConnectIssue } = await import("./notification-service");
        void notifyOwnerStripeConnectIssue({
          businessId: business.id,
          businessName: business.name,
          businessLogoUrl: business.logoUrl,
          ownerId: business.ownerId,
          notificationEmail: business.notificationEmail,
          orderNotificationEmail: business.orderNotificationEmail,
          issue,
        }).catch(() => {});
      }
    }
    return connectStatusFromAccount(null, null);
  }

  const account = await retrieveConnectAccount(accountId);
  const previousStatus = business.stripeConnectStatus;
  const paymentStatus = deriveConnectPaymentStatus(account, accountId);

  if (business.stripeConnectStatus !== paymentStatus) {
    await db
      .update(businessesTable)
      .set({ stripeConnectStatus: paymentStatus })
      .where(eq(businessesTable.id, businessId));
  }

  const snapshot = connectStatusFromAccount(account, accountId);
  if (shouldNotifyStripeConnectTransition(previousStatus, paymentStatus, accountId)) {
    const issue = describeStripeConnectIssue({
      paymentStatus,
      chargesEnabled: snapshot.chargesEnabled,
      payoutsEnabled: snapshot.payoutsEnabled,
      detailsSubmitted: snapshot.detailsSubmitted,
      requirementsCurrentlyDueCount: snapshot.requirementsCurrentlyDueCount,
      connectedAccountId: accountId,
      previousStatus,
    });
    if (issue) {
      const { notifyOwnerStripeConnectIssue } = await import("./notification-service");
      void notifyOwnerStripeConnectIssue({
        businessId: business.id,
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        ownerId: business.ownerId,
        notificationEmail: business.notificationEmail,
        orderNotificationEmail: business.orderNotificationEmail,
        issue,
      }).catch(() => {});
    }
  }

  return snapshot;
}

export async function ensureExpressConnectedAccount(
  business: Business,
): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const existing = business.stripeConnectedAccountId?.trim();
  if (existing) {
    return existing;
  }

  const account = await stripe.accounts.create({
    type: "express",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      businessId: String(business.id),
      businessSlug: business.slug,
    },
  });

  await db
    .update(businessesTable)
    .set({
      stripeConnectedAccountId: account.id,
      stripeConnectStatus: "pending",
    })
    .where(eq(businessesTable.id, business.id));

  return account.id;
}

export async function createConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  if (!link.url) {
    throw new Error("Stripe did not return an onboarding URL");
  }

  return link.url;
}

export async function createConnectDashboardLink(accountId: string): Promise<string> {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const link = await stripe.accounts.createLoginLink(accountId);
  if (!link.url) {
    throw new Error("Stripe did not return a dashboard URL");
  }

  return link.url;
}

export async function handleAccountUpdatedEvent(account: import("stripe").default.Account): Promise<void> {
  const businessIdRaw = account.metadata?.businessId;
  const businessId = businessIdRaw ? parseInt(businessIdRaw, 10) : NaN;

  let business: Business | undefined;
  if (Number.isFinite(businessId)) {
    [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
  }

  if (!business) {
    [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.stripeConnectedAccountId, account.id));
  }

  if (!business) return;

  const previousStatus = business.stripeConnectStatus;
  const paymentStatus = deriveConnectPaymentStatus(account, account.id);
  await db
    .update(businessesTable)
    .set({
      stripeConnectedAccountId: account.id,
      stripeConnectStatus: paymentStatus,
    })
    .where(eq(businessesTable.id, business.id));

  const snapshot = connectStatusFromAccount(account, account.id);
  if (
    shouldNotifyStripeConnectTransition(previousStatus, paymentStatus, account.id)
  ) {
    const issue = describeStripeConnectIssue({
      paymentStatus,
      chargesEnabled: snapshot.chargesEnabled,
      payoutsEnabled: snapshot.payoutsEnabled,
      detailsSubmitted: snapshot.detailsSubmitted,
      requirementsCurrentlyDueCount: snapshot.requirementsCurrentlyDueCount,
      connectedAccountId: account.id,
      previousStatus,
    });
    if (issue) {
      const { notifyOwnerStripeConnectIssue } = await import("./notification-service");
      void notifyOwnerStripeConnectIssue({
        businessId: business.id,
        businessName: business.name,
        businessLogoUrl: business.logoUrl,
        ownerId: business.ownerId,
        notificationEmail: business.notificationEmail,
        orderNotificationEmail: business.orderNotificationEmail,
        issue,
      }).catch(() => {});
    }
  }
}

export function validateOnlineCardPaymentReady(business: Business): string | null {
  if (!stripe) {
    if (process.env.NODE_ENV === "production") {
      return "Online card payments are not available right now.";
    }
    return null;
  }

  if (!business.stripeConnectedAccountId) {
    return "This business has not connected Stripe for online card payments.";
  }

  if (business.stripeConnectStatus !== "connected") {
    return "This business has not finished Stripe setup for online card payments.";
  }

  return null;
}
