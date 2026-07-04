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

export async function createStripeCheckoutSession(
  orderId: number,
  orderNumber: string,
  lineItems: StripeCheckoutLineItem[],
  connectedAccountId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string | null; sessionId: string | null; mockMode: boolean }> {
  if (!stripe) {
    if (!isMockCheckoutAllowed()) {
      throw new Error("Stripe is not configured for production checkout");
    }
    return { url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}mock=1`, sessionId: null, mockMode: true };
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
      metadata: {
        orderId: String(orderId),
        orderNumber,
        connectedAccountId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    {
      stripeAccount: connectedAccountId,
    },
  );

  return { url: session.url, sessionId: session.id, mockMode: false };
}
