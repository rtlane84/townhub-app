import Stripe from "stripe";
import { isMockCheckoutAllowed } from "./stripe-config";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" })
  : null;

export const isMockMode = !stripe;

export type StripeCheckoutLineItem = {
  name: string;
  unitAmountCents: number;
  quantity: number;
};

export type CreateStripeCheckoutSessionInput = {
  lineItems: StripeCheckoutLineItem[];
  connectedAccountId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput,
): Promise<{ url: string | null; sessionId: string | null; mockMode: boolean }> {
  const { lineItems, connectedAccountId, successUrl, cancelUrl, metadata } = input;

  if (!stripe) {
    if (!isMockCheckoutAllowed()) {
      throw new Error("Stripe is not configured for production checkout");
    }
    return {
      url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}mock=1`,
      sessionId: null,
      mockMode: true,
    };
  }

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.unitAmountCents,
        },
        quantity: item.quantity,
      })),
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    {
      stripeAccount: connectedAccountId,
    },
  );

  return { url: session.url, sessionId: session.id, mockMode: false };
}

export async function retrieveOpenStripeCheckoutSession(
  sessionId: string,
  connectedAccountId: string,
): Promise<{ url: string; sessionId: string } | null> {
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: connectedAccountId },
    );
    if (session.status === "open" && session.url) {
      return { url: session.url, sessionId: session.id };
    }
  } catch {
    return null;
  }

  return null;
}

/** Retrieve a Checkout Session from the connected account (any status). */
export async function retrieveStripeCheckoutSession(
  sessionId: string,
  connectedAccountId: string,
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) return null;

  try {
    return await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: connectedAccountId },
    );
  } catch {
    return null;
  }
}
