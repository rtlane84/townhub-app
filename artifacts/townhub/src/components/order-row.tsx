import { cn } from "@/lib/utils";
import { useOrderHighlight, type OrderHighlightKind } from "@/hooks/order-dashboard-refresh-context";

const HIGHLIGHT_ROW_CLASS: Record<OrderHighlightKind, string> = {
  new: "order-row-new",
  updated: "order-row-updated",
};

export function orderStatusHighlightClass(highlight: OrderHighlightKind | undefined): string | undefined {
  if (highlight === "updated") return "order-status-updated";
  if (highlight === "new") return "order-status-new";
  return undefined;
}

interface OrderRowProps {
  orderId: number;
  className?: string;
  children: React.ReactNode;
}

export function OrderRow({ orderId, className, children }: OrderRowProps) {
  const highlight = useOrderHighlight(orderId);

  return (
    <div
      className={cn(className, highlight && HIGHLIGHT_ROW_CLASS[highlight])}
      data-testid={`row-order-${orderId}`}
      data-order-highlight={highlight ?? undefined}
    >
      {children}
    </div>
  );
}
