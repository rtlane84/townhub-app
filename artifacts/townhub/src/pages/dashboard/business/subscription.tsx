import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openStripeCheckoutUrl } from "@/lib/capacitor-shell";
import { useLocation } from "wouter";
import {
  useGetMySubscription,
  getGetMySubscriptionQueryKey,
  useCreateBusinessSubscriptionCheckout,
  useCreateBusinessSubscriptionPortal,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { ChangePlanDialog } from "@/components/subscription/change-plan-dialog";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { useSubscriptionStripeSync, type SubscriptionSyncOptions } from "@/hooks/use-subscription-stripe-sync";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  subscriptionStatusDisplayLabel,
  isSubscriptionCancelScheduled,
  subscriptionAccessEndDate,
  formatPlanAmount,
  formatBillingIntervalLabel,
  activePlanPrice,
  isComplimentaryPricingPlan,
  subscriptionNeedsStripeCheckout,
  trialDaysRemaining,
} from "@/lib/subscription-display";
import { pollUntilSubscriptionReady } from "@/lib/subscription-activation";
import { isStoreDistribution } from "@/lib/distribution-channel";

type CheckoutReturnParams = SubscriptionSyncOptions & {
  kind: "checkout" | "portal";
};

type ActivationPhase = "idle" | "syncing" | "success" | "error";

function formatDisplayDate(value?: string | Date | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BusinessSubscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { business, isLoading: bizLoading } = useSelectedBusiness();
  const { syncOnce, invalidateBusinessHubQueries } = useSubscriptionStripeSync(business?.id);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [activationPhase, setActivationPhase] = useState<ActivationPhase>("idle");
  const [activationAttempt, setActivationAttempt] = useState(0);
  const [activationError, setActivationError] = useState<string | null>(null);
  const pendingCheckoutReturn = useRef<CheckoutReturnParams | null>(null);
  const checkoutReturnStarted = useRef(false);
  const storeDistribution = isStoreDistribution();

  const subscriptionQueryKey = getGetMySubscriptionQueryKey(business?.id ?? 0);

  const { data: subscription, isLoading: subLoading, refetch, isFetching } = useGetMySubscription(
    business?.id ?? 0,
    {
      query: {
        enabled: !!business?.id,
        queryKey: subscriptionQueryKey,
        refetchOnWindowFocus: true,
      },
    },
  );

  const checkoutMutation = useCreateBusinessSubscriptionCheckout();
  const portalMutation = useCreateBusinessSubscriptionPortal();

  const runActivationSync = useCallback(
    async (params: CheckoutReturnParams) => {
      if (!business?.id) return;

      setActivationPhase("syncing");
      setActivationError(null);
      setActivationAttempt(0);
      setSyncPending(true);

      try {
        await pollUntilSubscriptionReady(
          () =>
            syncOnce({
              mock: params.mock,
              planId: params.planId,
              interval: params.interval,
            }),
          {
            maxAttempts: params.kind === "portal" ? 4 : 12,
            intervalMs: 2500,
            onAttempt: setActivationAttempt,
          },
        );
        invalidateBusinessHubQueries(business.id);
        setActivationPhase("success");
        toast({
          title: params.kind === "checkout" ? "Subscription activated" : "Billing updated",
          description:
            params.kind === "checkout"
              ? "Your plan is active and features are now unlocked."
              : "Your billing changes have been applied.",
        });
      } catch (err) {
        setActivationPhase("error");
        setActivationError(
          err instanceof Error ? err.message : "Could not confirm subscription activation.",
        );
      } finally {
        setSyncPending(false);
      }
    },
    [business?.id, invalidateBusinessHubQueries, syncOnce, toast],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const portal = params.get("portal");

    if (checkout === "canceled") {
      toast({ title: "Checkout canceled", description: "No changes were made to your subscription." });
      setLocation("/dashboard/business/subscription", { replace: true });
      return;
    }

    if (checkout === "success" || portal === "return") {
      pendingCheckoutReturn.current = {
        kind: checkout === "success" ? "checkout" : "portal",
        mock: params.get("mock") === "1",
        planId: params.get("planId") ? parseInt(params.get("planId")!, 10) : undefined,
        interval:
          params.get("interval") === "yearly"
            ? "yearly"
            : params.get("interval") === "monthly"
              ? "monthly"
              : undefined,
      };
      setLocation("/dashboard/business/subscription", { replace: true });
    }
  }, [setLocation, toast]);

  useEffect(() => {
    if (!business?.id || !pendingCheckoutReturn.current || checkoutReturnStarted.current) return;
    checkoutReturnStarted.current = true;
    const params = pendingCheckoutReturn.current;
    pendingCheckoutReturn.current = null;
    void runActivationSync(params);
  }, [business?.id, runActivationSync]);

  const syncFromStripe = useCallback(async () => {
    if (!business?.id) return;
    setSyncPending(true);
    setActivationPhase("idle");
    setActivationError(null);
    try {
      await syncOnce();
      invalidateBusinessHubQueries(business.id);
    } finally {
      setSyncPending(false);
    }
  }, [business?.id, invalidateBusinessHubQueries, syncOnce]);

  const isLoading = bizLoading || subLoading;
  const complimentary = subscription?.plan ? isComplimentaryPricingPlan(subscription.plan) : false;
  const needsCheckout = subscription ? subscriptionNeedsStripeCheckout(subscription) : false;
  const trialRemaining = trialDaysRemaining(subscription?.trialEndsAt);
  const isTrialing = subscription && ["TRIAL", "TRIALING"].includes(subscription.status);
  const isCanceled = subscription?.status === "CANCELED";
  const cancelScheduled = subscription ? isSubscriptionCancelScheduled(subscription) : false;

  const statusVariant = useMemo(() => {
    if (!subscription) return "outline";
    if (subscription.status === "PAST_DUE") return "destructive";
    if (isCanceled) return "destructive";
    if (cancelScheduled) return "secondary";
    if (["TRIAL", "TRIALING", "BETA"].includes(subscription.status)) return "secondary";
    if (subscription.status === "ACTIVE") return "default";
    return "outline";
  }, [subscription, isCanceled, cancelScheduled]);

  useEffect(() => {
    if (subscription?.billingInterval) {
      setBillingInterval(subscription.billingInterval);
    }
  }, [subscription?.billingInterval]);

  async function handleRefresh() {
    if (!business?.id) return;
    try {
      await syncFromStripe();
    } catch {
      await refetch();
    }
  }

  async function handleStartCheckout() {
    if (!business?.id || !subscription?.planId) return;
    const interval = subscription.billingInterval ?? billingInterval;
    try {
      const result = await checkoutMutation.mutateAsync({
        id: business.id,
        data: { planId: subscription.planId, interval },
      });
      openStripeCheckoutUrl(result.url);
    } catch (err) {
      toast({
        title: "Unable to start checkout",
        description: err instanceof Error ? err.message : "Please try again or contact support.",
        variant: "destructive",
      });
    }
  }

  async function handleOpenPortal() {
    if (!business?.id) return;
    try {
      const result = await portalMutation.mutateAsync({ id: business.id });
      openStripeCheckoutUrl(result.url);
    } catch (err) {
      toast({
        title: "Unable to open billing portal",
        description: err instanceof Error ? err.message : "Please try again or contact support.",
        variant: "destructive",
      });
    }
  }

  const accessEndDate = subscription ? subscriptionAccessEndDate(subscription) : null;
  const canManageBilling = !storeDistribution && !complimentary && !!subscription?.stripeCustomerId;
  const canChangePlan = !storeDistribution && !complimentary;
  const isRefreshing = isFetching || syncPending;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (storeDistribution || params.get("open") !== "billing" || !business?.id || !canManageBilling) return;
    setLocation("/dashboard/business/subscription", { replace: true });
    void handleOpenPortal();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- open billing once when linked from email
  }, [business?.id, canManageBilling, storeDistribution]);

  return (
    <BusinessDashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-28">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-bold">Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Your plan, billing interval, and enabled features
            </p>
          </div>
          {subscription && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>

        {activationPhase === "syncing" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <Loader2 className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-medium">Activating your subscription…</p>
                <p className="text-muted-foreground mt-1">
                  Syncing with Stripe and unlocking your plan features.
                  {activationAttempt > 0 ? ` (check ${activationAttempt})` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activationPhase === "success" && (
          <Card className="border-green-200 bg-green-50/80 dark:border-green-900/40 dark:bg-green-950/30">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Subscription active</p>
                <p className="text-green-800/90 dark:text-green-200/90 mt-1">
                  Your plan features are unlocked. Explore your Business Hub menu to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activationPhase === "error" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-destructive">Could not confirm activation</p>
                <p className="text-muted-foreground">{activationError}</p>
                <LoadingButton
                  size="sm"
                  variant="outline"
                  loading={syncPending}
                  loadingText="Retrying…"
                  onClick={() => void syncFromStripe()}
                >
                  Retry Status
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !subscription ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No subscription yet</p>
              <p className="text-sm mt-1">Contact the platform administrator to assign a plan.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {isCanceled && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-start gap-3 text-sm">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Subscription canceled</p>
                    <p className="text-muted-foreground mt-1">
                      Paid features are no longer available.
                      {storeDistribution
                        ? " Contact TownHub support for account help."
                        : " Choose a plan below to subscribe again."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {subscription.status === "PAST_DUE" && (
              <Card className="border-amber-300 bg-amber-50/60">
                <CardContent className="p-4 flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Payment past due</p>
                    <p className="text-amber-800/90 mt-1">
                      {storeDistribution
                        ? "Your subscription needs attention. Contact TownHub support for account help."
                        : "Update your payment method in Manage Billing to avoid losing access."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {cancelScheduled && !isCanceled && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4 flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Cancellation scheduled</p>
                    <p className="text-amber-800/90 mt-1">
                      {accessEndDate ? (
                        <>
                          Your subscription is scheduled to cancel on{" "}
                          <strong>{formatDisplayDate(accessEndDate)}</strong>. You keep access until then.
                        </>
                      ) : (
                        <>Your subscription is scheduled to cancel at the end of the current billing period.</>
                      )}{" "}
                      {storeDistribution
                        ? " Contact TownHub support for account help."
                        : " Reactivate anytime in Manage Billing."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">Current plan</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cancelScheduled && (
                      <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">
                        Canceling
                      </Badge>
                    )}
                    <Badge variant={statusVariant}>
                      {subscriptionStatusDisplayLabel(subscription)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscription.plan && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b gap-4">
                      <span className="text-sm font-medium">Plan</span>
                      <span className="font-semibold text-right">{subscription.plan.name}</span>
                    </div>
                    {!complimentary && (
                      <>
                        <div className="flex items-center justify-between py-2 border-b gap-4">
                          <span className="text-sm font-medium">Billing</span>
                          <span className="font-semibold capitalize">
                            {formatBillingIntervalLabel(subscription.billingInterval)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b gap-4">
                          <span className="text-sm font-medium">Current price</span>
                          <span className="font-semibold text-primary">
                            {activePlanPrice(subscription.plan, subscription.billingInterval)}
                          </span>
                        </div>
                      </>
                    )}
                    {complimentary && (
                      <p className="text-sm text-muted-foreground pt-1">
                        {subscription.plan.isBeta
                          ? "Founding / beta access — no Stripe billing required."
                          : "This plan is complimentary — no Stripe billing required."}
                      </p>
                    )}
                    {!complimentary && subscription.plan.yearlyPrice != null && subscription.plan.yearlyPrice > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Monthly: {formatPlanAmount(subscription.plan.monthlyPrice)} · Yearly:{" "}
                        {formatPlanAmount(subscription.plan.yearlyPrice, "year")}
                      </p>
                    )}
                  </>
                )}
                {isTrialing && trialRemaining != null && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">Trial days remaining</span>
                    <span className="text-amber-600 font-medium">{trialRemaining}</span>
                  </div>
                )}
                {subscription.trialEndsAt && isTrialing && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">Trial ends</span>
                    <span className="text-amber-600 font-medium">
                      {formatDisplayDate(subscription.trialEndsAt)}
                    </span>
                  </div>
                )}
                {(accessEndDate || cancelScheduled) && !complimentary && !isCanceled && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">
                      {cancelScheduled ? "Access until" : "Next billing date"}
                    </span>
                    <span className={cancelScheduled ? "text-amber-700 font-medium" : undefined}>
                      {accessEndDate ? formatDisplayDate(accessEndDate) : "End of billing period"}
                    </span>
                  </div>
                )}
                {cancelScheduled && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">Cancellation</span>
                    <span className="text-amber-700 font-medium text-right text-sm">
                      {storeDistribution ? "Scheduled" : "Scheduled — reactivate in Manage Billing"}
                    </span>
                  </div>
                )}
                {subscription.startedAt && (
                  <div className="flex items-center justify-between py-2 gap-4">
                    <span className="text-sm font-medium">Member since</span>
                    <span>{formatDisplayDate(subscription.startedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Enabled features
                </CardTitle>
                <CardDescription>Capabilities included with your current plan</CardDescription>
              </CardHeader>
              <CardContent>
                {subscription.features && subscription.features.length > 0 ? (
                  <ul className="space-y-2">
                    {subscription.features.map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-medium">{feature.name}</span>
                          {feature.description && (
                            <span className="block text-muted-foreground text-xs mt-0.5">
                              {feature.description}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No feature mappings configured yet for this plan.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </CardTitle>
                <CardDescription>
                  {complimentary
                    ? "Billing is managed by the platform for this plan."
                    : storeDistribution
                      ? "View your TownHub subscription status and plan details."
                      : "Manage your TownHub subscription through Stripe."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {storeDistribution && !complimentary && (
                  <p className="text-sm text-muted-foreground">
                    Subscription changes are not available in this app. If your business was recently
                    approved, follow the setup instructions sent to your account email. Contact TownHub
                    support if you need account help.
                  </p>
                )}

                {!storeDistribution && needsCheckout && subscription.plan && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {subscription.plan.trialDays > 0
                        ? `Start your ${subscription.plan.trialDays}-day free trial to activate paid features.`
                        : "Complete checkout to activate your paid plan."}
                    </p>
                    {(subscription.plan.yearlyPrice != null && subscription.plan.yearlyPrice > 0) && (
                      <div className="flex gap-2">
                        {(["monthly", "yearly"] as const).map((value) => (
                          <Button
                            key={value}
                            type="button"
                            size="sm"
                            variant={billingInterval === value ? "default" : "outline"}
                            onClick={() => setBillingInterval(value)}
                          >
                            {value === "monthly" ? "Monthly" : "Yearly"}
                          </Button>
                        ))}
                      </div>
                    )}
                    <LoadingButton
                      onClick={() => void handleStartCheckout()}
                      loading={checkoutMutation.isPending}
                      loadingText="Redirecting…"
                    >
                      {subscription.plan.trialDays > 0 ? "Start Free Trial" : "Start Subscription"}
                    </LoadingButton>
                  </div>
                )}

                {!storeDistribution && <div className="flex flex-wrap gap-2">
                  {canChangePlan && business?.id && (
                    <Button variant="default" onClick={() => setChangePlanOpen(true)}>
                      Change Plan
                    </Button>
                  )}
                  {canManageBilling && (
                    <LoadingButton
                      variant="outline"
                      onClick={() => void handleOpenPortal()}
                      loading={portalMutation.isPending}
                      loadingText="Opening…"
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Manage Billing
                    </LoadingButton>
                  )}
                </div>}

                {!storeDistribution && !needsCheckout && !complimentary && !subscription.stripeCustomerId && (
                  <p className="text-sm text-muted-foreground">
                    Billing details will appear here after your first checkout.
                  </p>
                )}

                {complimentary && (
                  <p className="text-sm text-muted-foreground">
                    {storeDistribution
                      ? "Contact the platform administrator if you need help with your plan."
                      : "To move to a paid plan, use Change Plan or contact the platform administrator."}
                  </p>
                )}
              </CardContent>
            </Card>

            {!storeDistribution && business?.id && (
              <ChangePlanDialog
                businessId={business.id}
                currentPlanId={subscription.planId}
                currentInterval={subscription.billingInterval ?? billingInterval}
                open={changePlanOpen}
                onOpenChange={setChangePlanOpen}
              />
            )}
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
