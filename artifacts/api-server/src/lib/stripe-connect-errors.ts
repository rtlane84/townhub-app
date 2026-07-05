import Stripe from "stripe";

export type StripeConnectHttpError = {
  status: number;
  error: string;
  code: string;
};

export function mapStripeConnectStartError(err: unknown): StripeConnectHttpError {
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const message = err.message ?? "";

    if (message.includes("signed up for Connect")) {
      return {
        status: 503,
        code: "stripe_connect_not_enabled",
        error:
          "Stripe Connect is not enabled on the platform Stripe account yet. " +
          "The TownHub platform operator must open the Stripe Dashboard → Connect and complete platform setup, then retry.",
      };
    }

    return {
      status: 400,
      code: "stripe_invalid_request",
      error: message || "Stripe rejected the Connect request.",
    };
  }

  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      status: 503,
      code: "stripe_authentication_failed",
      error: "Stripe API authentication failed. Check platform Stripe configuration.",
    };
  }

  if (err instanceof Error && err.message === "Stripe is not configured") {
    return {
      status: 503,
      code: "stripe_not_configured",
      error: "Stripe is not configured on this platform.",
    };
  }

  return {
    status: 500,
    code: "stripe_connect_start_failed",
    error: "Failed to start Stripe Connect setup.",
  };
}
