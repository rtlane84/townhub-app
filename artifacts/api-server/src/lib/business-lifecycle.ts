import { db, businessesTable, businessSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { stripe } from "./stripe";
import { shouldCancelStripeSubscription } from "./business-lifecycle-core";

export type ArchiveBusinessResult =
  | {
      ok: true;
      archived: true;
      subscriptionCanceled: boolean;
      hadActiveSubscription: boolean;
      alreadyArchived?: false;
    }
  | { ok: true; archived: true; alreadyArchived: true; subscriptionCanceled: false; hadActiveSubscription: false }
  | { ok: false; status: number; error: string; stripeError?: string };

async function cancelStripeSubscriptionImmediately(
  stripeSubscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (stripeSubscriptionId.startsWith("sub_mock")) {
    return { ok: true };
  }

  if (!stripe) {
    return { ok: false, error: "Stripe is not configured" };
  }

  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err, stripeSubscriptionId }, "Failed to cancel Stripe subscription during business archive");
    return { ok: false, error: message };
  }
}

export async function archiveBusiness(businessId: number): Promise<ArchiveBusinessResult> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    return { ok: false, status: 404, error: "Business not found" };
  }

  if (business.archivedAt) {
    return {
      ok: true,
      archived: true,
      alreadyArchived: true,
      subscriptionCanceled: false,
      hadActiveSubscription: false,
    };
  }

  const [subscription] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));

  const hadActiveSubscription =
    subscription != null &&
    ["TRIAL", "TRIALING", "ACTIVE", "PAST_DUE"].includes(subscription.status);

  let subscriptionCanceled = false;

  if (subscription && shouldCancelStripeSubscription(subscription.status, subscription.stripeSubscriptionId)) {
    const cancelResult = await cancelStripeSubscriptionImmediately(subscription.stripeSubscriptionId!);
    if (!cancelResult.ok) {
      return {
        ok: false,
        status: 502,
        error: "Failed to cancel Stripe subscription. The business was not removed.",
        stripeError: cancelResult.error,
      };
    }
    subscriptionCanceled = true;
  }

  if (subscription) {
    await db
      .update(businessSubscriptionsTable)
      .set({
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        renewalAt: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
      })
      .where(eq(businessSubscriptionsTable.businessId, businessId));
  }

  await db
    .update(businessesTable)
    .set({
      active: false,
      archivedAt: new Date(),
    })
    .where(eq(businessesTable.id, businessId));

  return {
    ok: true,
    archived: true,
    subscriptionCanceled,
    hadActiveSubscription,
  };
}
