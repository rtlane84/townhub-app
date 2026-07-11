import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import { confirmPendingCheckoutPayment, orderConfirmationPath } from "@/lib/order-access";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-context";
import {
  isStripeCartClearedForOrder,
  markStripeCartClearedForOrder,
  parseStripeCheckoutReturn,
  shouldClearCartForStripeSuccess,
} from "@/lib/stripe-checkout-return";

const POLL_MS = 2500;
const MAX_MS = 60_000;

/**
 * After Stripe Checkout, the order may not exist yet (created on webhook).
 * This page confirms payment / waits for materialization, then routes to /order/:id.
 */
export default function CheckoutReturnPage() {
  const [, params] = useRoute("/checkout/return/:pendingCheckoutId");
  const pendingCheckoutId = Number(params?.pendingCheckoutId);
  const [, setLocation] = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { cart, clearCartForBusiness } = useCart();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const accessToken = useMemo(
    () =>
      new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get(
        "token",
      ),
    [pendingCheckoutId],
  );

  const stripeReturn = useMemo(
    () => parseStripeCheckoutReturn(typeof window !== "undefined" ? window.location.search : ""),
    [pendingCheckoutId],
  );

  useEffect(() => {
    if (!pendingCheckoutId || startedRef.current) return;
    if (stripeReturn === "canceled") {
      setLocation("/cart?payment=canceled");
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    const started = Date.now();

    const run = async () => {
      while (!cancelled && Date.now() - started < MAX_MS) {
        try {
          const authToken = isSignedIn ? await getToken() : null;
          const result = await confirmPendingCheckoutPayment(
            pendingCheckoutId,
            accessToken,
            authToken,
          );
          if (result.orderId && result.paymentStatus === "PAID") {
            const alreadyCleared = isStripeCartClearedForOrder(result.orderId);
            if (
              shouldClearCartForStripeSuccess(
                "success",
                result.businessId,
                cart.businessId,
                alreadyCleared,
              )
            ) {
              clearCartForBusiness(result.businessId);
              markStripeCartClearedForOrder(result.orderId);
            }
            const path = user
              ? `/my-orders/${result.orderId}`
              : orderConfirmationPath(result.orderId, result.accessToken);
            setLocation(`${path}${path.includes("?") ? "&" : "?"}payment=success`);
            return;
          }
        } catch {
          // Keep trying — webhook may still be in flight.
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      if (!cancelled) {
        setError(
          "We’re still confirming your payment. If you were charged, your order will appear shortly.",
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    pendingCheckoutId,
    stripeReturn,
    accessToken,
    isSignedIn,
    getToken,
    setLocation,
    user,
    cart.businessId,
    clearCartForBusiness,
  ]);

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold">Confirming payment</h2>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <h2 className="font-serif text-2xl font-bold">Confirming your payment…</h2>
      <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
    </div>
  );
}
