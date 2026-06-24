import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" })
  : null;

export const isMockMode = !stripeKey;

export async function createStripeCheckoutSession(
  orderId: number,
  orderNumber: string,
  businessName: string,
  items: Array<{ name: string; price: number; quantity: number }>,
  total: number,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string | null; sessionId: string | null; mockMode: boolean }> {
  if (!stripe) {
    // Mock mode — no Stripe keys configured
    return { url: `${successUrl}?mock=1`, sessionId: null, mockMode: true };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    metadata: { orderId: String(orderId), orderNumber },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { url: session.url, sessionId: session.id, mockMode: false };
}
