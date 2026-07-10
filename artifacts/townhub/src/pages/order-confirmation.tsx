import { useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { getGetOrderQueryKey } from "@workspace/api-client-react";
import { fetchOrderById } from "@/lib/order-access";
import { CheckCircle2, ShoppingBag, Store, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart-context";
import {
  formatOrderPaymentLabel,
  isStripeCartClearedForOrder,
  markStripeCartClearedForOrder,
  parseStripeCheckoutReturn,
  shouldClearCartForStripeSuccess,
  stripePaymentPendingMessage,
} from "@/lib/stripe-checkout-return";
import { getCustomerEstimatedWindowLabel } from "@/lib/order-prep-timing";
import { OrderTotalsSummary } from "@/components/order-totals-summary";
import { formatOrderTicketNumber, formatOrderReferenceLabel } from "@workspace/api-zod";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/:id");
  const orderId = Number(params?.id);
  const { getToken, isSignedIn } = useAuth();
  const { cart, clearCartForBusiness } = useCart();

  const accessToken = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("token"),
    [orderId],
  );

  const stripeReturn = useMemo(
    () => parseStripeCheckoutReturn(typeof window !== "undefined" ? window.location.search : ""),
    [orderId],
  );

  const { data: order, isLoading } = useQuery({
    queryKey: [...getGetOrderQueryKey(orderId), accessToken, isSignedIn],
    enabled: !!orderId,
    queryFn: async () => {
      const authToken = isSignedIn ? await getToken() : null;
      return fetchOrderById(orderId, accessToken, authToken);
    },
  });

  useEffect(() => {
    if (!orderId || !order) return;

    const alreadyCleared = isStripeCartClearedForOrder(orderId);
    if (
      !shouldClearCartForStripeSuccess(stripeReturn, order.businessId, cart.businessId, alreadyCleared)
    ) {
      return;
    }

    clearCartForBusiness(order.businessId);
    markStripeCartClearedForOrder(orderId);
  }, [orderId, order, stripeReturn, cart.businessId, clearCartForBusiness]);

  const paymentPendingMessage = order
    ? stripePaymentPendingMessage(stripeReturn, order.paymentMethod, order.paymentStatus)
    : null;

  const estimatedWindowLabel = order ? getCustomerEstimatedWindowLabel(order) : null;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-full mb-4" />
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-serif font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">We couldn't find the details for this order.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Order Received!</h1>
        <p className="text-lg text-muted-foreground">
          Thank you for supporting local. {order.businessName} has received {formatOrderTicketNumber(order.id, "Order", order.businessOrderNumber)}.
        </p>
        {order.orderNumber ? (
          <p className="text-sm text-muted-foreground mt-2">{formatOrderReferenceLabel(order.orderNumber)}</p>
        ) : null}
        {paymentPendingMessage ? (
          <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">{paymentPendingMessage}</p>
        ) : null}
      </div>

      <Card className="border-border/50 shadow-md mb-8 overflow-hidden">
        <div className="bg-primary/5 p-6 flex justify-between items-center border-b border-border/50">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Purchased from</p>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span className="font-serif font-bold text-xl">{order.businessName}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground font-medium mb-1">Status</p>
            <Badge variant="outline" className="bg-white border-primary/20 text-primary uppercase font-bold tracking-wider">
              {order.status}
            </Badge>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            <div className="p-6">
              <h3 className="font-serif font-bold text-lg mb-4">Fulfillment Details</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {order.fulfillmentType === "PICKUP" ? <Store className="h-4 w-4 text-muted-foreground" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{order.fulfillmentType === "PICKUP" ? "Store Pickup" : "Delivery"}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.fulfillmentType === "PICKUP" ? "You'll be notified when ready" : order.deliveryAddress}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Estimated Time</p>
                    <p className="text-sm text-muted-foreground">
                      {estimatedWindowLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-serif font-bold text-lg mb-4">Customer Details</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {order.customerName}</p>
                <p><span className="text-muted-foreground">Email:</span> {order.customerEmail}</p>
                {order.customerPhone && <p><span className="text-muted-foreground">Phone:</span> {order.customerPhone}</p>}
                <p><span className="text-muted-foreground">Payment:</span> {formatOrderPaymentLabel(order.paymentMethod, order.paymentStatus)}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="p-6">
            <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Order Items
            </h3>
            
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted px-2 py-1 rounded text-xs font-medium">{item.quantity}x</span>
                    <span className="font-medium text-sm">{item.productName}</span>
                  </div>
                  <span className="text-sm font-medium">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {order ? <OrderTotalsSummary order={order} /> : null}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/">
          <Button variant="outline" className="rounded-full px-8">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  );
}
