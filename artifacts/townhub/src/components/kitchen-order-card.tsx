import type { Order } from "@workspace/api-client-react";
import { formatOrderTicketNumber, formatOrderReferenceLabel } from "@workspace/api-zod";
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
import { businessOrderDetailPath } from "@/lib/business-order-list-url";
import { getKitchenQuickAction } from "@/lib/kitchen-display";
import {
  getBusinessOrderTimingLabel,
  getBusinessReadyWindowLabel,
  isOrderOverdue,
} from "@/lib/order-prep-timing";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Play, Truck, Store } from "lucide-react";
import type { OrderStatus } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type Props = {
  order: Order;
  updating: boolean;
  onAdvance: (orderId: number, nextStatus: string) => void;
};

function kitchenActionIcon(nextStatus: OrderStatus) {
  switch (nextStatus) {
    case "CONFIRMED":
      return Check;
    case "PREPARING":
      return Play;
    case "READY_FOR_PICKUP":
    case "OUT_FOR_DELIVERY":
    case "COMPLETED":
      return Check;
    default:
      return Check;
  }
}

export function KitchenOrderCard({ order, updating, onAdvance }: Props) {
  const [, setLocation] = useLocation();
  const highlight = useOrderHighlight(order.id);
  const quickAction = getKitchenQuickAction(order);
  const paymentFlag = getBusinessOrderPaymentFlag(order.paymentMethod, order.paymentStatus);
  const timeLabel = order.createdAt ? formatOrderRelativeTime(order.createdAt) : "";
  const readyWindow = getBusinessReadyWindowLabel(order);
  const timingLabel = getBusinessOrderTimingLabel(order);
  const overdue = isOrderOverdue(order);
  const ActionIcon = quickAction ? kitchenActionIcon(quickAction.nextStatus) : Check;
  const ticketLabel = formatOrderTicketNumber(order.id, "Ticket", order.businessOrderNumber);
  const referenceLabel = formatOrderReferenceLabel(order.orderNumber);

  function openOrderDetail() {
    setLocation(businessOrderDetailPath(order.id));
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openOrderDetail();
    }
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm space-y-2.5 cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        overdue && "border-l-4 border-l-destructive bg-destructive/[0.03]",
        !overdue && highlight === "new" && "border-primary ring-2 ring-primary/30",
        !overdue && highlight === "updated" && "border-amber-400/60",
        orderStatusHighlightClass(highlight),
      )}
      data-testid={`kitchen-order-${order.id}`}
      onClick={openOrderDetail}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`Open ${ticketLabel} details`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-lg leading-tight truncate tracking-tight">{ticketLabel}</p>
          {referenceLabel ? (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{referenceLabel}</p>
          ) : null}
          {timeLabel ? (
            <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {overdue ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive"
              data-testid={`kitchen-overdue-${order.id}`}
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Overdue
            </span>
          ) : null}
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
          <span className={cn(overdue && "text-destructive font-semibold")}>
            {" · "}
            {timingLabel}
          </span>
        ) : null}
      </p>

      <p className="text-base font-semibold truncate">{order.customerName}</p>

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
          className="w-full font-semibold"
          loading={updating}
          loadingText="Updating…"
          onClick={(event) => {
            event.stopPropagation();
            onAdvance(order.id, quickAction.nextStatus);
          }}
          data-testid={`kitchen-action-${order.id}`}
        >
          <ActionIcon className="h-4 w-4 mr-2" aria-hidden />
          {quickAction.label}
        </LoadingButton>
      ) : null}
    </article>
  );
}
