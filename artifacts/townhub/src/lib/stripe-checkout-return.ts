export type StripeCheckoutReturn = "success" | "canceled" | null;

export function parseStripeCheckoutReturn(search: string): StripeCheckoutReturn {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const payment = params.get("payment");
  if (payment === "success") return "success";
  if (payment === "canceled") return "canceled";
  return null;
}

export function stripeCartClearedKey(orderId: number): string {
  return `local-order-hub-stripe-cart-cleared-${orderId}`;
}

export function isStripeCartClearedForOrder(orderId: number): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(stripeCartClearedKey(orderId)) === "1";
}

export function markStripeCartClearedForOrder(orderId: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(stripeCartClearedKey(orderId), "1");
}

export function shouldClearCartForStripeSuccess(
  stripeReturn: StripeCheckoutReturn,
  orderBusinessId: number,
  cartBusinessId: number | null,
  alreadyClearedForOrder: boolean,
): boolean {
  if (stripeReturn !== "success" || alreadyClearedForOrder) return false;
  return cartBusinessId === orderBusinessId;
}

export function stripePaymentPendingMessage(
  stripeReturn: StripeCheckoutReturn,
  paymentMethod: string | undefined,
  paymentStatus: string | undefined,
): string | null {
  if (stripeReturn !== "success" || paymentMethod !== "STRIPE") return null;
  if (paymentStatus === "PAID") return null;
  return "Confirming your card payment… this usually takes a few seconds.";
}

export function formatOrderPaymentLabel(
  paymentMethod: string | undefined,
  paymentStatus: string | undefined,
): string {
  if (paymentMethod === "IN_PERSON") return "Pay at pickup/delivery";
  if (paymentStatus === "PAID") return "Paid with Card";
  if (paymentMethod === "STRIPE") return "Payment processing";
  return "Card";
}
