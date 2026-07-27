import Stripe from "stripe";

export type StripeCheckoutHttpError = {
  status: number;
  error: string;
  code: string;
  stripeRequestId?: string;
};

/**
 * Maps client-fixable Stripe Checkout Session failures to HTTP 400 responses.
 * Returns null for unexpected errors that should still surface as unhandled 500s.
 */
export function mapStripeCheckoutSessionError(err: unknown): StripeCheckoutHttpError | null {
  if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) {
    return null;
  }

  const stripeRequestId = err.requestId ?? undefined;

  if (err.code === "amount_too_small") {
    return {
      status: 400,
      code: "amount_too_small",
      error:
        "Order total must be at least $0.50 USD to pay with card. Increase the cart total or use pay at pickup if available.",
      stripeRequestId,
    };
  }

  return {
    status: 400,
    code: err.code ?? "stripe_invalid_request",
    error: "Card checkout could not be started. Please try again or choose another payment method.",
    stripeRequestId,
  };
}
