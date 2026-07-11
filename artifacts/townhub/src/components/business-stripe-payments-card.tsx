import { useEffect } from "react";
import { openStripeCheckoutUrl } from "@/lib/capacitor-shell";
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

export function BusinessStripePaymentsCard({ businessId, stripeReturn }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useGetBusinessStripeStatus(businessId, {
    query: { enabled: businessId > 0, queryKey: getGetBusinessStripeStatusQueryKey(businessId) },
  });

  const startConnect = useStartBusinessStripeConnect({
    mutation: {
      onSuccess: (result) => {
        if (result.url) {
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
    void refetch();
    queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(businessId) });
    toast({
      title: "Returned from Stripe",
      description: "Refreshing your payment connection status…",
    });
  }, [stripeReturn, businessId, refetch, queryClient, toast]);

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
    <Card>
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

              {pending && !connected ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    void refetch();
                    queryClient.invalidateQueries({ queryKey: getGetBusinessStripeStatusQueryKey(businessId) });
                  }}
                >
                  Refresh status
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
