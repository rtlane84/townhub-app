import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/components/cart-context";
import { useGetBusinessCheckout, useCreateOrder, useCreateCheckoutSession } from "@workspace/api-client-react";
import { FulfillmentType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Minus, Plus, ShoppingBag, Store, CreditCard, Info } from "lucide-react";
import { useAsyncAction } from "@/hooks/use-async-action";
import { orderConfirmationPath } from "@/lib/order-access";
import { BusinessLogoBadge } from "@/components/business-logo-badge";
import { useToast } from "@/hooks/use-toast";
import { formatTime12h } from "@workspace/api-zod";
import { useUser } from "@clerk/react";
import {
  resolvePaymentMode,
  allowsOnlinePayment,
  allowsPayAtPickup,
} from "@workspace/api-zod";
import { parseStripeCheckoutReturn } from "@/lib/stripe-checkout-return";

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const stripeReturn = useMemo(
    () => parseStripeCheckoutReturn(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );

  useEffect(() => {
    if (stripeReturn !== "canceled") return;
    toast({
      title: "Checkout canceled",
      description: "Your cart was not changed. You can try again when you're ready.",
    });
    window.history.replaceState({}, "", window.location.pathname);
  }, [stripeReturn, toast]);

  const { data: business } = useGetBusinessCheckout(cart.businessId!, {
    query: { enabled: !!cart.businessId, queryKey: ["/api/businesses/checkout", cart.businessId] },
  });

  useEffect(() => {
    if (!user) return;
    if (user.fullName) setCustomerName(user.fullName);
    if (user.primaryEmailAddress?.emailAddress) {
      setCustomerEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user]);

  const bx = business as unknown as Record<string, unknown> | undefined;
  const pickupInstructions = bx?.pickupInstructions as string | undefined;
  const deliveryInstructions = bx?.deliveryInstructions as string | undefined;
  const minimumOrderForDelivery = bx?.minimumOrderForDelivery as number | undefined;

  const defaultFulfillment: FulfillmentType =
    business?.pickupEnabled ? "PICKUP" : business?.deliveryEnabled ? "DELIVERY" : "PICKUP";

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(defaultFulfillment);
  const [customerName, setCustomerName] = useState(user?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [checkoutTarget, setCheckoutTarget] = useState<"card" | "pickup" | null>(null);

  const createOrder = useCreateOrder();
  const createCheckoutSession = useCreateCheckoutSession();

  const meetsDeliveryMinimum =
    !minimumOrderForDelivery || total >= minimumOrderForDelivery;

  const performCheckout = useCallback(
    async (payAtPickup: boolean) => {
      const order = await createOrder.mutateAsync({
        data: {
          businessId: cart.businessId!,
          fulfillmentType,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress : undefined,
          notes,
          paymentMethod: payAtPickup ? "IN_PERSON" : "STRIPE",
          items: cart.items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            selectedOptionIds: item.selectedOptionIds.length ? item.selectedOptionIds : undefined,
          })),
        },
      });

      if (payAtPickup) {
        clearCart();
        setLocation(
          user
            ? `/my-orders/${order.id}`
            : orderConfirmationPath(order.id, order.accessToken),
        );
        toast({ title: "Order placed successfully!" });
        return;
      }

      const session = await createCheckoutSession.mutateAsync({
        data: { orderId: order.id, accessToken: order.accessToken },
      });
      if (session.url) {
        window.location.href = session.url;
        return;
      }

      clearCart();
      setLocation(
        user
          ? `/my-orders/${order.id}`
          : orderConfirmationPath(order.id, order.accessToken),
      );
      toast({ title: "Order placed successfully!" });
    },
    [
      cart.businessId,
      cart.items,
      clearCart,
      createCheckoutSession,
      createOrder,
      customerEmail,
      customerName,
      customerPhone,
      deliveryAddress,
      fulfillmentType,
      notes,
      setLocation,
      toast,
      user,
    ],
  );

  const { run: runCheckout, pending: isSubmitting } = useAsyncAction(performCheckout);

  const handleCheckout = (payAtPickup: boolean) => {
    if (!customerName.trim()) {
      toast({ title: "Missing details", description: "Please provide your name.", variant: "destructive" });
      return;
    }
    if (!customerEmail.trim()) {
      toast({ title: "Missing details", description: "Please provide your email for order updates.", variant: "destructive" });
      return;
    }
    if (!customerPhone.trim()) {
      toast({ title: "Missing details", description: "Please provide a phone number so the business can reach you.", variant: "destructive" });
      return;
    }
    if (fulfillmentType === "DELIVERY" && !deliveryAddress.trim()) {
      toast({ title: "Missing details", description: "Please provide a delivery address.", variant: "destructive" });
      return;
    }
    if (fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum) {
      toast({ title: "Minimum not met", description: `Add $${(minimumOrderForDelivery! - total).toFixed(2)} more to qualify for delivery.`, variant: "destructive" });
      return;
    }

    setCheckoutTarget(payAtPickup ? "pickup" : "card");
    void runCheckout(payAtPickup).catch(() => {
      toast({ title: "Error", description: "Failed to place order. Please try again.", variant: "destructive" });
      setCheckoutTarget(null);
    });
  };

  if (!cart.businessId || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/businesses">
          <Button size="lg" className="rounded-full px-8">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  const deliveryFee = fulfillmentType === "DELIVERY" ? (business?.deliveryFee || 0) : 0;
  const finalTotal = total + deliveryFee;

  const showPickup = business?.pickupEnabled !== false;
  const showDelivery = business?.deliveryEnabled === true;
  const paymentMode = business ? resolvePaymentMode(business) : "ONLINE_ONLY";
  const onlinePaymentsAvailable = business?.onlinePaymentsAvailable === true;
  const showOnlinePayment = allowsOnlinePayment(paymentMode) && onlinePaymentsAvailable;
  const showPayAtPickup = allowsPayAtPickup(paymentMode);
  const onlineUnavailable =
    allowsOnlinePayment(paymentMode) && !onlinePaymentsAvailable;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Checkout</h1>
      <p className="text-muted-foreground mb-8">
        {user
          ? "Your account details are prefilled below. You can edit them before placing your order."
          : "No account needed — enter your contact details to place your order."}
      </p>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fulfillment type selector */}
              <div className="space-y-3">
                <Label>How would you like to receive your order?</Label>
                <RadioGroup
                  value={fulfillmentType}
                  onValueChange={(v) => setFulfillmentType(v as FulfillmentType)}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  {showPickup && (
                    <div
                      className={`flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer transition-colors ${fulfillmentType === "PICKUP" ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => setFulfillmentType("PICKUP")}
                    >
                      <RadioGroupItem value="PICKUP" id="pickup" />
                      <div>
                        <Label htmlFor="pickup" className="cursor-pointer font-medium">Store Pickup</Label>
                        {business?.orderCutoffTime && (
                          <p className="text-xs text-muted-foreground mt-0.5">Order by {formatTime12h(business.orderCutoffTime)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {showDelivery && (
                    <div
                      className={`flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer transition-colors ${fulfillmentType === "DELIVERY" ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => setFulfillmentType("DELIVERY")}
                    >
                      <RadioGroupItem value="DELIVERY" id="delivery" />
                      <div>
                        <Label htmlFor="delivery" className="cursor-pointer font-medium">
                          Delivery
                          {business?.deliveryFee ? ` (+$${business.deliveryFee.toFixed(2)})` : " (Free)"}
                        </Label>
                        {minimumOrderForDelivery && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${minimumOrderForDelivery.toFixed(2)} minimum
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </RadioGroup>

                {/* Fulfillment instructions */}
                {fulfillmentType === "PICKUP" && pickupInstructions && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{pickupInstructions}</span>
                  </div>
                )}
                {fulfillmentType === "DELIVERY" && deliveryInstructions && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <span>{deliveryInstructions}</span>
                  </div>
                )}
                {fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum && minimumOrderForDelivery && (
                  <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Add <strong>${(minimumOrderForDelivery - total).toFixed(2)}</strong> more to qualify for delivery.
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-lg font-serif">Contact Information</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                    <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                    <Input id="phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                  </div>
                </div>
              </div>

              {fulfillmentType === "DELIVERY" && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-lg font-serif">
                      Delivery Address <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder="123 Main St, Apt 4B..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <Label className="text-lg font-serif">Order Notes</Label>
                <Textarea
                  placeholder="Any special requests or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="sticky top-24">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-3">
                <BusinessLogoBadge
                  src={business?.logoUrl}
                  alt={business?.name ? `${business.name} logo` : "Business logo"}
                  size="xs"
                  className="shadow-sm"
                />
                <div>
                  <CardTitle className="text-lg">{business?.name || "Loading..."}</CardTitle>
                  <p className="text-xs text-muted-foreground">Order Summary</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[40vh] overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.lineKey} className="p-4 flex gap-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <span className="font-medium text-sm">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.selectedOptions.map((o) => o.optionName).join(", ")}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border rounded-md">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.lineKey)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4 p-6 bg-muted/10 border-t border-border/50">
              <div className="w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {fulfillmentType === "DELIVERY" && deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-serif font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full space-y-3 pt-4">
                {onlineUnavailable && (
                  <p className="text-sm text-muted-foreground text-center px-2">
                    Online card payments are not available for this business yet.
                    {showPayAtPickup ? " You can still pay at pickup." : ""}
                  </p>
                )}

                {showOnlinePayment && (
                  <LoadingButton
                    className="w-full h-12 text-lg rounded-full"
                    onClick={() => handleCheckout(false)}
                    disabled={(fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum) || isSubmitting}
                    loading={isSubmitting && checkoutTarget === "card"}
                    loadingText="Processing…"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay with Card
                  </LoadingButton>
                )}

                {showPayAtPickup && (
                  <LoadingButton
                    variant={showOnlinePayment ? "outline" : "default"}
                    className="w-full h-12 text-lg rounded-full"
                    onClick={() => handleCheckout(true)}
                    disabled={(fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum) || isSubmitting}
                    loading={isSubmitting && checkoutTarget === "pickup"}
                    loadingText="Placing order…"
                  >
                    <Store className="h-5 w-5 mr-2" />
                    Pay at {fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
                  </LoadingButton>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
