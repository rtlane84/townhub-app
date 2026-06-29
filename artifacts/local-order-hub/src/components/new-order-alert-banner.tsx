import { Link } from "wouter";
import { Bell, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingOrderBanners } from "@/hooks/order-dashboard-refresh-context";
import { orderBannerDetails, orderBannerHeadline } from "@/lib/order-alert-format";

export function NewOrderAlertBanner() {
  const { pendingBanners, dismissBanner } = usePendingOrderBanners();

  if (!pendingBanners.length) return null;

  const latest = pendingBanners[0]!;
  const extraCount = pendingBanners.length - 1;
  const orderPath = `/dashboard/business/orders/${latest.order.id}`;

  return (
    <div
      className="mb-6 rounded-xl border-2 border-primary/40 bg-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="polite"
      data-testid="new-order-alert-banner"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bell className="h-4 w-4" aria-hidden />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold text-sm text-foreground">
            {orderBannerHeadline(latest.order, extraCount)}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {orderBannerDetails(latest.order)}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link href={orderPath}>
              <Button
                size="sm"
                className="h-8"
                data-testid="new-order-banner-view"
                onClick={() => dismissBanner(latest.order.id)}
              >
                View order
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            {extraCount > 0 && (
              <Link href="/dashboard/business/orders">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  data-testid="new-order-banner-view-all"
                  onClick={() => pendingBanners.forEach((b) => dismissBanner(b.order.id))}
                >
                  View all orders
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss new order alert"
          data-testid="new-order-banner-dismiss"
          onClick={() => dismissBanner(latest.order.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
