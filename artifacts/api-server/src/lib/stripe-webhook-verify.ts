import type Stripe from "stripe";

export type StripeWebhookSecretSource =
  | "connect"
  | "platform"
  | "legacy";

export type ResolvedStripeWebhookSecret = {
  secret: string;
  source: StripeWebhookSecretSource;
};

/**
 * Collect webhook signing secrets to try, in preference order.
 * Connect + platform destinations each have their own whsec_;
 * STRIPE_WEBHOOK_SECRET remains as a temporary fallback.
 */
export function resolveStripeWebhookSecrets(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedStripeWebhookSecret[] {
  const entries: Array<{ key: string; source: StripeWebhookSecretSource }> = [
    { key: "STRIPE_CONNECT_WEBHOOK_SECRET", source: "connect" },
    { key: "STRIPE_PLATFORM_WEBHOOK_SECRET", source: "platform" },
    { key: "STRIPE_WEBHOOK_SECRET", source: "legacy" },
  ];

  const seen = new Set<string>();
  const resolved: ResolvedStripeWebhookSecret[] = [];

  for (const entry of entries) {
    const secret = env[entry.key]?.trim();
    if (!secret) continue;
    if (seen.has(secret)) continue;
    seen.add(secret);
    resolved.push({ secret, source: entry.source });
  }

  return resolved;
}

export function hasAnyStripeWebhookSecret(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveStripeWebhookSecrets(env).length > 0;
}

export type StripeWebhookVerificationResult =
  | { ok: true; event: Stripe.Event; secretSource: StripeWebhookSecretSource }
  | { ok: false; status: number; error: string; reason: string };

/**
 * Verify Stripe-Signature against connect, platform, and/or legacy secrets.
 * Tries each configured secret until one succeeds (destinations share one URL).
 */
export function verifyStripeWebhookSignature(input: {
  rawBody: unknown;
  signatureHeader: string | string[] | undefined;
  stripeClient: Stripe | null;
  secrets?: ResolvedStripeWebhookSecret[];
  /** @deprecated Prefer multi-secret resolution; kept for unit tests. */
  webhookSecret?: string | undefined;
}): StripeWebhookVerificationResult {
  const sig = input.signatureHeader;
  if (!sig || typeof sig !== "string") {
    return {
      ok: false,
      status: 400,
      error: "Missing Stripe signature",
      reason: "missing_signature",
    };
  }

  if (!input.stripeClient) {
    return {
      ok: false,
      status: 503,
      error: "Webhook processing not configured",
      reason: "not_configured",
    };
  }

  if (!Buffer.isBuffer(input.rawBody)) {
    return {
      ok: false,
      status: 400,
      error: "Webhook requires raw request body",
      reason: "invalid_body",
    };
  }

  const secrets =
    input.secrets ??
    (input.webhookSecret?.trim()
      ? [{ secret: input.webhookSecret.trim(), source: "legacy" as const }]
      : resolveStripeWebhookSecrets());

  if (secrets.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "Webhook processing not configured",
      reason: "not_configured",
    };
  }

  let lastInvalid = false;
  for (const candidate of secrets) {
    try {
      const event = input.stripeClient.webhooks.constructEvent(
        input.rawBody,
        sig,
        candidate.secret,
      );
      return { ok: true, event, secretSource: candidate.source };
    } catch {
      lastInvalid = true;
    }
  }

  if (lastInvalid) {
    return {
      ok: false,
      status: 400,
      error: "Invalid Stripe signature",
      reason: "invalid_signature",
    };
  }

  return {
    ok: false,
    status: 400,
    error: "Invalid Stripe signature",
    reason: "invalid_signature",
  };
}
