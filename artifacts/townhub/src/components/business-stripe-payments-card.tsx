import { useEffect, useCallback } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { openStripeCheckoutUrl } from "@/lib/capacitor-shell";
import { isNativeApp } from "@/lib/native-platform";
import {
  useGetBusinessStripeStatus,
  useStartBusinessStripeConnect,
  getGetBusinessStripeStatusQueryKey,
  getGetMyBusinessQueryKey,
  getGetBusinessQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  businessId: number;
  stripeReturn?: boolean;
};

function statusLabel(paymentStatus: string | undefined): string {
  switch (paymentStatus) {
    case "connected":
      return "Connected";
    case "pending":
      return "Setup in progress";
    case "restricted":
      return "Restricted";
    default:
      return "Not connected";
  }
}

function statusVariant(paymentStatus: string | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (paymentStatus) {
    case "connected":
      return "default";
    case "restricted":
      return "destructive";
    case "pending":
      return "secondary";
    default:
      return "outline";
  }
}

function connectErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Please try again.";
}

const NATIVE_CONNECT_PENDING_KEY = "townhub.nativeStripeConnectPending";

export function BusinessStripePaymentsCard({ businessId, stripeReturn }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading, isFetching, refetch } = useGetBusinessStripeStatus(businessId, {
    query: { enabled: businessId > 0, queryKey: getGetBusinessStripeStatusQueryKey(businessId) },
  });

  const refreshConnectStatus = useCallback(
    async (opts?: { quiet?: boolean }) => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(businessId) });
      queryClient.invalidateQueries({ queryKey: getGetBusinessStripeStatusQueryKey(businessId) });
      if (!opts?.quiet) {
        toast({
          title: "Payment status refreshed",
          description: "Pulled the latest Stripe connection state.",
        });
      }
    },
    [businessId, queryClient, refetch, toast],
  );

  const startConnect = useStartBusinessStripeConnect({
    mutation: {
      onSuccess: (result) => {
        if (result.url) {
          if (isNativeApp()) {
            try {
              sessionStorage.setItem(NATIVE_CONNECT_PENDING_KEY, String(businessId));
            } catch {
              // ignore
            }
          }
          openStripeCheckoutUrl(result.url);
        }
      },
      onError: (err: unknown) => {
        toast({
          title: "Could not open Stripe",
          description: connectErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    if (!stripeReturn) return;
    void refreshConnectStatus({ quiet: true });
    toast({
      title: "Returned from Stripe",
      description: "Refreshing your payment connection status…",
    });
  }, [stripeReturn, refreshConnectStatus, toast]);

  // Cap: Stripe returns via HTTPS bounce → deep link, or the user closes the
  // in-app browser. Refetch when the app is active again after Connect.
  useEffect(() => {
    if (!isNativeApp() || businessId <= 0) return;

    const maybeRefresh = () => {
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem(NATIVE_CONNECT_PENDING_KEY);
      } catch {
        pending = null;
      }
      if (pending !== String(businessId) && !stripeReturn) return;
      try {
        sessionStorage.removeItem(NATIVE_CONNECT_PENDING_KEY);
      } catch {
        // ignore
      }
      void refreshConnectStatus({ quiet: true });
    };

    const browserSub = Browser.addListener("browserFinished", maybeRefresh);
    const appSub = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) maybeRefresh();
    });

    return () => {
      void browserSub.then((h) => h.remove());
      void appSub.then((h) => h.remove());
    };
  }, [businessId, refreshConnectStatus, stripeReturn]);

  // Poll only while this Settings Payments card is mounted AND Connect is
  // still pending/restricted. Other pages do not run this effect. Caps +
  // visibility checks keep background churn low.
  useEffect(() => {
    if (status?.paymentStatus !== "pending" && status?.paymentStatus !== "restricted") {
      return;
    }

    let ticks = 0;
    const maxTicks = 8; // ~8 * 20s ≈ 2.5 minutes, then stop
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      ticks += 1;
      if (ticks > maxTicks) {
        window.clearInterval(id);
        return;
      }
      void refreshConnectStatus({ quiet: true });
    }, 20_000);

    return () => window.clearInterval(id);
  }, [status?.paymentStatus, refreshConnectStatus]);

  const connected = status?.paymentStatus === "connected";
  const pending = status?.paymentStatus === "pending" || status?.paymentStatus === "restricted";

  function handleConnect() {
    startConnect.mutate({ businessId, data: {} });
  }

  function handleManage() {
    startConnect.mutate({
      businessId,
      data: { action: connected ? "dashboard" : undefined },
    });
  }

  return (
    <Card id="stripe-payments" data-testid="stripe-payments-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Payments
        </CardTitle>
        <CardDescription>
          Connect Stripe to accept online card payments. Stripe securely processes payments and pays your business directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payment status…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(status?.paymentStatus)}>{statusLabel(status?.paymentStatus)}</Badge>
              {status?.mode && status.mode !== "mock" && status.mode !== "unknown" && (
                <Badge variant="outline">{status.mode === "live" ? "Live" : "Test"} mode</Badge>
              )}
              {connected && status?.onlinePaymentsAvailable && (
                <Badge variant="secondary">Online payments enabled</Badge>
              )}
            </div>

            {connected ? (
              <div className="space-y-2 text-sm">
                {status?.connectedAccountLabel && (
                  <p>
                    <span className="text-muted-foreground">Connected account:</span>{" "}
                    <span className="font-mono">{status.connectedAccountLabel}</span>
                  </p>
                )}
                <p className="text-muted-foreground">
                  Customers paying by card at checkout are charged through your connected Stripe account.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect Stripe to accept online card payments. Pay-at-pickup orders still work without Stripe.
                {pending
                  ? " Stripe may still be verifying — use Refresh status or wait a moment."
                  : null}
              </p>
            )}

            {pending && !connected && status?.requirementsCurrentlyDueCount ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Stripe needs {status.requirementsCurrentlyDueCount} more item
                {status.requirementsCurrentlyDueCount === 1 ? "" : "s"} to finish setup.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <LoadingButton
                  onClick={handleConnect}
                  loading={startConnect.isPending}
                  loadingText="Opening Stripe…"
                  data-testid="button-connect-stripe"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {pending ? "Continue Stripe setup" : "Connect Stripe"}
                </LoadingButton>
              ) : (
                <LoadingButton
                  variant="outline"
                  onClick={handleManage}
                  loading={startConnect.isPending}
                  loadingText="Opening Stripe…"
                  data-testid="button-manage-stripe"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Stripe
                </LoadingButton>
              )}

              <Button
                variant="ghost"
                disabled={isFetching}
                onClick={() => void refreshConnectStatus()}
                data-testid="button-refresh-stripe-status"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing…
                  </>
                ) : (
                  "Refresh status"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
