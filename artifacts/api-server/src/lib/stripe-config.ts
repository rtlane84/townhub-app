import type Stripe from "stripe";

export type StripeKeyMode = "mock" | "test" | "live" | "unknown";

export function getStripeKeyMode(secretKey: string | undefined): StripeKeyMode {
  if (!secretKey?.trim()) return "mock";
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return "unknown";
}

export interface StripeConfigValidation {
  ok: boolean;
  mode: StripeKeyMode;
  issues: string[];
}

/** Validates Stripe env for production-safe card payments (no secrets in output). */
export function validateStripeConfig(
  env: {
    secretKey?: string;
    webhookSecret?: string;
    connectWebhookSecret?: string;
    platformWebhookSecret?: string;
    nodeEnv?: string;
  } = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    platformWebhookSecret: process.env.STRIPE_PLATFORM_WEBHOOK_SECRET,
    nodeEnv: process.env.NODE_ENV,
  },
): StripeConfigValidation {
  const mode = getStripeKeyMode(env.secretKey);
  const issues: string[] = [];

  if (mode === "mock") {
    if (env.nodeEnv === "production") {
      issues.push("Stripe secret key is required in production (mock checkout must not be used live).");
    }
    return { ok: issues.length === 0, mode, issues };
  }

  if (mode === "unknown") {
    issues.push("Stripe secret key format is unrecognized.");
  }

  const secrets = [
    env.connectWebhookSecret,
    env.platformWebhookSecret,
    env.webhookSecret,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    issues.push(
      "At least one webhook signing secret is required when Stripe is enabled (connect and/or platform destination; legacy single secret is a fallback).",
    );
  } else {
    for (const secret of secrets) {
      if (!secret.startsWith("whsec_")) {
        issues.push("Webhook signing secret should start with whsec_.");
        break;
      }
    }
  }

  if (mode === "test" && env.nodeEnv === "production") {
    issues.push("Production is using a Stripe test key. Use a live key for real payments.");
  }

  return { ok: issues.length === 0, mode, issues };
}

export function parseCheckoutSessionOrderId(session: Stripe.Checkout.Session): number | null {
  const raw = session.metadata?.orderId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export function parseCheckoutSessionPendingCheckoutId(
  session: Stripe.Checkout.Session,
): number | null {
  const raw = session.metadata?.pendingCheckoutId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export type MarkOrderPaidResult =
  | { ok: true; orderId: number; alreadyPaid: boolean }
  | { ok: false; reason: string; orderId?: number };

export function expectedCheckoutAmountCents(orderTotal: string): number {
  return Math.round(parseFloat(orderTotal) * 100);
}

export function isMockCheckoutAllowed(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}

export function parseCheckoutSessionConnectedAccountId(
  session: Stripe.Checkout.Session,
  eventAccount?: string | null,
): string | null {
  const fromEvent = eventAccount?.trim();
  if (fromEvent) return fromEvent;

  const fromMetadata = session.metadata?.connectedAccountId?.trim();
  if (fromMetadata) return fromMetadata;

  return null;
}
