import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { useLocation } from "wouter";

function bannerCopy(status: string | null | undefined): { title: string; description: string } | null {
  if (status === "restricted") {
    return {
      title: "Stripe account needs attention",
      description:
        "Payments or payouts may be blocked. Open Settings to review and fix your Stripe account.",
    };
  }
  if (status === "pending") {
    return {
      title: "Finish Stripe setup",
      description:
        "Verification or account setup is incomplete. Online payments may not work until this is resolved.",
    };
  }
  return null;
}

/** Persistent Business Hub warning while Stripe Connect remains unhealthy. */
export function StripeConnectAlertBanner() {
  const { business } = useSelectedBusiness();
  const [, setLocation] = useLocation();

  const copy = bannerCopy(business?.stripeConnectStatus ?? null);
  if (!copy) return null;

  return (
    <div
      className="mb-6 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 shadow-sm"
      role="alert"
      data-testid="stripe-connect-alert-banner"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{copy.title}</p>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              className="h-8"
              data-testid="stripe-connect-banner-settings"
              onClick={() => setLocation("/dashboard/business/settings")}
            >
              Open Settings
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
