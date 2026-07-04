import type { Order } from "@workspace/api-client-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { orderStatusHighlightClass } from "@/components/order-row";
import { useOrderHighlight } from "@/hooks/order-dashboard-refresh-context";
import {
  formatOrderRelativeTime,
  fulfillmentLabel,
  getBusinessOrderPaymentFlag,
  PAYMENT_FLAG_DOT_STYLES,
  PAYMENT_FLAG_LABELS,
} from "@/lib/business-order-display";
import { getKitchenQuickAction } from "@/lib/kitchen-display";
import {
  getBusinessOrderTimingLabel,
  getBusinessReadyWindowLabel,
} from "@/lib/order-prep-timing";
import { cn } from "@/lib/utils";
import { Truck, Store } from "lucide-react";

type Props = {
  order: Order;
  updating: boolean;
  onAdvance: (orderId: number, nextStatus: string) => void;
};

export function KitchenOrderCard({ order, updating, onAdvance }: Props) {
  const highlight = useOrderHighlight(order.id);
  const quickAction = getKitchenQuickAction(order);
  const paymentFlag = getBusinessOrderPaymentFlag(order.paymentMethod, order.paymentStatus);
  const timeLabel = order.createdAt ? formatOrderRelativeTime(order.createdAt) : "";
  const readyWindow = getBusinessReadyWindowLabel(order);
  const timingLabel = getBusinessOrderTimingLabel(order);

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm space-y-2.5",
        highlight === "new" && "border-primary ring-2 ring-primary/30",
        highlight === "updated" && "border-amber-400/60",
        orderStatusHighlightClass(highlight),
      )}
      data-testid={`kitchen-order-${order.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-base leading-tight truncate">
            {order.orderNumber ?? `#${order.id}`}
          </p>
          {timeLabel ? (
            <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 shrink-0 rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
          )}
          aria-label={`Payment: ${PAYMENT_FLAG_LABELS[paymentFlag]}`}
        >
          <span className={cn("size-1.5 rounded-full", PAYMENT_FLAG_DOT_STYLES[paymentFlag])} aria-hidden />
          {PAYMENT_FLAG_LABELS[paymentFlag]}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {order.fulfillmentType === "DELIVERY" ? (
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Store className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span>{fulfillmentLabel(order.fulfillmentType)}</span>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        {readyWindow}
        {timingLabel ? (
          <span className={cn(timingLabel.startsWith("Overdue") && "text-destructive font-medium")}>
            {" · "}
            {timingLabel}
          </span>
        ) : null}
      </p>

      <p className="text-sm font-medium truncate">{order.customerName}</p>

      <ul className="space-y-1 text-sm">
        {(order.items ?? []).map((item) => (
          <li key={item.id ?? `${item.productId}-${item.productName}`} className="flex gap-2">
            <span className="font-semibold tabular-nums shrink-0">{item.quantity}×</span>
            <span className="leading-snug">{item.productName}</span>
          </li>
        ))}
      </ul>

      {order.notes?.trim() ? (
        <p className="text-xs bg-muted/60 rounded px-2 py-1.5 whitespace-pre-wrap">{order.notes.trim()}</p>
      ) : null}

      {quickAction ? (
        <LoadingButton
          size="sm"
          className="w-full"
          loading={updating}
          loadingText="Updating…"
          onClick={() => onAdvance(order.id, quickAction.nextStatus)}
          data-testid={`kitchen-action-${order.id}`}
        >
          {quickAction.label}
        </LoadingButton>
      ) : null}
    </article>
  );
}
