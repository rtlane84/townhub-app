import type { BusinessSubscription } from "@workspace/api-client-react";
import { subscriptionNeedsStripeCheckout } from "./subscription-display.ts";

const ACTIVATED_STATUSES = new Set(["TRIAL", "TRIALING", "ACTIVE", "BETA"]);

export function isSubscriptionActivated(status: string): boolean {
  return ACTIVATED_STATUSES.has(status);
}

/** Subscription is ready for feature access (not incomplete / pending checkout). */
export function isSubscriptionReady(subscription: Pick<BusinessSubscription, "status"> & {
  stripeSubscriptionId?: string | null;
  plan?: BusinessSubscription["plan"];
}): boolean {
  if (!isSubscriptionActivated(subscription.status)) return false;
  return !subscriptionNeedsStripeCheckout(subscription as BusinessSubscription);
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type PollSubscriptionActivationOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  onAttempt?: (attempt: number) => void;
};

export async function pollUntilSubscriptionReady(
  sync: () => Promise<BusinessSubscription | null>,
  options?: PollSubscriptionActivationOptions,
): Promise<BusinessSubscription> {
  const maxAttempts = options?.maxAttempts ?? 12;
  const intervalMs = options?.intervalMs ?? 2500;
  let lastResult: BusinessSubscription | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    options?.onAttempt?.(attempt);
    try {
      lastResult = await sync();
      if (lastResult && isSubscriptionReady(lastResult)) {
        return lastResult;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  if (lastResult && isSubscriptionActivated(lastResult.status)) {
    return lastResult;
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Subscription activation is taking longer than expected. Try Refresh Status.";
  throw new Error(message);
}
