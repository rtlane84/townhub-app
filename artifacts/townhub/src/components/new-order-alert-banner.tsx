import { Bell, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendingOrderNotification } from "@/hooks/order-dashboard-refresh-context";
import { orderBannerDetails, orderBannerHeadline } from "@/lib/order-alert-format";
import { businessOrderDetailPath } from "@/lib/business-order-list-url";
import { useLocation } from "wouter";
import { BUSINESS_HUB_ORDERS_PATH } from "@/lib/business-hub-notification-manager";

export function NewOrderAlertBanner() {
  const [, setLocation] = useLocation();
  const { notification, clearNotification } = usePendingOrderNotification();

  if (!notification?.orders.length) return null;

  const latest = notification.orders[0]!;
  const totalCount = notification.orders.length;
  const multiple = totalCount > 1;

  const openLatestOrder = () => {
    setLocation(businessOrderDetailPath(latest.id));
    clearNotification();
  };

  const openOrdersList = () => {
    setLocation(BUSINESS_HUB_ORDERS_PATH);
    clearNotification();
  };

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
            {orderBannerHeadline(latest, totalCount)}
          </p>
          {!multiple ? (
            <p className="text-sm text-muted-foreground truncate">{orderBannerDetails(latest)}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {multiple ? (
              <Button
                size="sm"
                className="h-8"
                data-testid="new-order-banner-view-all"
                onClick={openOrdersList}
              >
                View Orders
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8"
                data-testid="new-order-banner-view"
                onClick={openLatestOrder}
              >
                Open Order
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss new order alert"
          data-testid="new-order-banner-dismiss"
          onClick={clearNotification}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
