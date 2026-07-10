import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/components/cart-context";
import { useGetBusinessCheckout, useCreateOrder, useCreateCheckoutSession, estimateOrderPrep } from "@workspace/api-client-react";
import { FulfillmentType } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
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
  calculateOrderTotals,
  centsToDollars,
  dollarsToCents,
} from "@workspace/api-zod";
import { parseStripeCheckoutReturn } from "@/lib/stripe-checkout-return";
import { openStripeCheckoutUrl } from "@/lib/capacitor-shell";
import { triggerCheckoutHaptic, triggerOrderPlacedHaptic } from "@/lib/native-haptics";
import { getCheckoutAsapLabel } from "@/lib/order-prep-timing";
import { CheckoutTotalsSummary } from "@/components/order-totals-summary";
import { NativeEmptyState } from "@/components/native-empty-state";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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

  const prepEstimateInput = useMemo(
    () =>
      cart.businessId && cart.items.length
        ? {
            businessId: cart.businessId,
            fulfillmentType,
            items: cart.items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
            })),
          }
        : null,
    [cart.businessId, cart.items, fulfillmentType],
  );

  const { data: prepEstimate } = useQuery({
    queryKey: ["/api/orders/prep-estimate", prepEstimateInput],
    queryFn: () => estimateOrderPrep(prepEstimateInput!),
    enabled: !!prepEstimateInput,
  });

  const asapEstimateLabel =
    prepEstimate != null
      ? getCheckoutAsapLabel(fulfillmentType, prepEstimate.minMinutes, prepEstimate.maxMinutes)
      : null;

  const performCheckout = useCallback(
    async (payAtPickup: boolean) => {
      if (business?.orderingAvailable === false) {
        toast({
          title: "Ordering unavailable",
          description:
            business.orderingUnavailableReason ??
            "This business is not accepting orders right now.",
          variant: "destructive",
        });
        return;
      }

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
        triggerOrderPlacedHaptic();
        setLocation(
          user
            ? `/my-orders/${order.id}`
            : orderConfirmationPath(order.id, order.accessToken),
        );
        toast({ title: "Order placed successfully!", skipNativeHaptic: true });
        return;
      }

      const session = await createCheckoutSession.mutateAsync({
        data: { orderId: order.id, accessToken: order.accessToken },
      });
      if (session.url) {
        openStripeCheckoutUrl(session.url);
        return;
      }

      clearCart();
      triggerOrderPlacedHaptic();
      setLocation(
        user
          ? `/my-orders/${order.id}`
          : orderConfirmationPath(order.id, order.accessToken),
      );
      toast({ title: "Order placed successfully!" });
    },
    [
      business?.orderingAvailable,
      business?.orderingUnavailableReason,
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
      <div className={cn(PAGE_CONTAINER, "max-w-lg py-10 native-animate-in")}>
        <NativeEmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
          centered
          action={
            <Link href="/businesses">
              <Button size="lg" className="w-full rounded-2xl px-8 shadow-sm">
                Start Shopping
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const deliveryFee = fulfillmentType === "DELIVERY" ? (business?.deliveryFee || 0) : 0;
  const checkoutTotals = useMemo(() => {
    const bx = business as unknown as {
      taxEnabled?: boolean;
      taxRatePercent?: number | null;
      taxLabel?: string | null;
    } | undefined;
    const totals = calculateOrderTotals({
      items: cart.items.map((item) => ({
        lineSubtotalCents: dollarsToCents(item.unitPrice * item.quantity),
        taxable: item.taxable !== false,
      })),
      taxEnabled: bx?.taxEnabled === true,
      taxRatePercent: bx?.taxRatePercent ?? 0,
      taxLabel: bx?.taxLabel ?? undefined,
      deliveryFeeCents: dollarsToCents(deliveryFee),
    });
    return {
      subtotal: centsToDollars(totals.subtotalCents),
      tax: centsToDollars(totals.taxCents),
      taxLabel: totals.taxLabel,
      deliveryFee: deliveryFee > 0 ? deliveryFee : null,
      total: centsToDollars(totals.totalCents),
    };
  }, [business, cart.items, deliveryFee]);
  const finalTotal = checkoutTotals.total;

  const showPickup = business?.pickupEnabled !== false;
  const showDelivery = business?.deliveryEnabled === true;
  const paymentMode = business ? resolvePaymentMode(business) : "ONLINE_ONLY";
  const onlinePaymentsAvailable = business?.onlinePaymentsAvailable === true;
  const showOnlinePayment = allowsOnlinePayment(paymentMode) && onlinePaymentsAvailable;
  const showPayAtPickup = allowsPayAtPickup(paymentMode);
  const onlineUnavailable =
    allowsOnlinePayment(paymentMode) && !onlinePaymentsAvailable;
  const orderingBlocked = business?.orderingAvailable === false;
  const orderingBlockedReason =
    business?.orderingUnavailableReason ?? "This business is not accepting orders right now.";

  return (
    <div className={cn(PAGE_CONTAINER, "max-w-6xl py-6 md:py-10 native-animate-in")}>
      <h1 className="mb-1 font-serif text-3xl font-bold tracking-tight text-platform-heading">Checkout</h1>
      <p className="mb-6 text-muted-foreground">
        {user
          ? "Your account details are prefilled below. You can edit them before placing your order."
          : "No account needed — enter your contact details to place your order."}
      </p>

      {orderingBlocked && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {orderingBlockedReason}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-platform-heading">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fulfillment type selector */}
              <div className="space-y-3">
                <Label>How would you like to receive your order?</Label>
                <RadioGroup
                  value={fulfillmentType}
                  onValueChange={(v) => setFulfillmentType(v as FulfillmentType)}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  {showPickup && (
                    <div
                      className={`flex flex-1 cursor-pointer items-center space-x-2 rounded-2xl border p-4 transition-colors ${fulfillmentType === "PICKUP" ? "border-primary bg-primary/5" : "border-border/60"}`}
                      onClick={() => setFulfillmentType("PICKUP")}
                    >
                      <RadioGroupItem value="PICKUP" id="pickup" />
                      <div>
                        <Label htmlFor="pickup" className="cursor-pointer font-medium">Store Pickup</Label>
                        {business?.orderCutoffTime && (
                          <p className="mt-0.5 text-xs text-muted-foreground">Order by {formatTime12h(business.orderCutoffTime)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {showDelivery && (
                    <div
                      className={`flex flex-1 cursor-pointer items-center space-x-2 rounded-2xl border p-4 transition-colors ${fulfillmentType === "DELIVERY" ? "border-primary bg-primary/5" : "border-border/60"}`}
                      onClick={() => setFulfillmentType("DELIVERY")}
                    >
                      <RadioGroupItem value="DELIVERY" id="delivery" />
                      <div>
                        <Label htmlFor="delivery" className="cursor-pointer font-medium">
                          Delivery
                          {business?.deliveryFee ? ` (+$${business.deliveryFee.toFixed(2)})` : " (Free)"}
                        </Label>
                        {minimumOrderForDelivery && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            ${minimumOrderForDelivery.toFixed(2)} minimum
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </RadioGroup>

                {/* Fulfillment instructions */}
                {fulfillmentType === "PICKUP" && pickupInstructions && (
                  <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{pickupInstructions}</span>
                  </div>
                )}
                {fulfillmentType === "DELIVERY" && deliveryInstructions && (
                  <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span>{deliveryInstructions}</span>
                  </div>
                )}
                {fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum && minimumOrderForDelivery && (
                  <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
          <Card className="sticky top-[calc(var(--site-header-height,4rem)+0.75rem)] border-0 shadow-[0_2px_20px_-6px_rgba(15,23,42,0.12)]">
            <CardHeader className="border-b border-border/40 bg-transparent pb-4">
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
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
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
                        <div className="flex items-center rounded-xl border border-border/50 bg-muted/20">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.lineKey)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 border-t border-border/40 bg-transparent p-5">
              <div className="w-full space-y-3">
                {asapEstimateLabel ? (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-sm">
                    <p className="font-medium text-foreground">{asapEstimateLabel}</p>
                  </div>
                ) : null}
                <CheckoutTotalsSummary totals={checkoutTotals} />
              </div>

              <div className="w-full space-y-2.5 pt-2">
                {onlineUnavailable && (
                  <p className="px-2 text-center text-sm text-muted-foreground">
                    Online card payments are not available for this business yet.
                    {showPayAtPickup ? " You can still pay at pickup." : ""}
                  </p>
                )}

                {showOnlinePayment && (
                  <LoadingButton
                    className="h-[50px] w-full rounded-2xl text-base"
                    onClick={() => {
                      triggerCheckoutHaptic();
                      handleCheckout(false);
                    }}
                    disabled={
                      orderingBlocked ||
                      (fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum) ||
                      isSubmitting
                    }
                    loading={isSubmitting && checkoutTarget === "card"}
                    loadingText="Processing…"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay with Card
                  </LoadingButton>
                )}

                {showPayAtPickup && (
                  <LoadingButton
                    variant={showOnlinePayment ? "outline" : "default"}
                    className="h-[50px] w-full rounded-2xl text-base"
                    onClick={() => {
                      triggerCheckoutHaptic();
                      handleCheckout(true);
                    }}
                    disabled={
                      orderingBlocked ||
                      (fulfillmentType === "DELIVERY" && !meetsDeliveryMinimum) ||
                      isSubmitting
                    }
                    loading={isSubmitting && checkoutTarget === "pickup"}
                    loadingText="Placing order…"
                  >
                    <Store className="mr-2 h-5 w-5" />
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
