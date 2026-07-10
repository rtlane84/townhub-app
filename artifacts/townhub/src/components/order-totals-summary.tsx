import { Separator } from "@/components/ui/separator";
import type { Order } from "@workspace/api-client-react";
import {
  resolveDisplayedOrderTotals,
  type CheckoutTotalsPreview,
} from "@/lib/order-totals-display";

type OrderTotalsLike = Pick<
  Order,
  "subtotal" | "tax" | "taxLabel" | "deliveryFee" | "total" | "items"
>;

type OrderTotalsSummaryProps = {
  order: OrderTotalsLike;
  totalClassName?: string;
};

export function OrderTotalsSummary({
  order,
  totalClassName = "font-serif font-bold text-lg",
}: OrderTotalsSummaryProps) {
  const totals = resolveDisplayedOrderTotals(order);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span>${totals.subtotal.toFixed(2)}</span>
      </div>
      {totals.tax > 0 ? (
        <div className="flex justify-between text-muted-foreground">
          <span>{totals.taxLabel?.trim() || "Sales Tax"}</span>
          <span>${totals.tax.toFixed(2)}</span>
        </div>
      ) : null}
      {totals.deliveryFee != null && totals.deliveryFee > 0 ? (
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery Fee</span>
          <span>${totals.deliveryFee.toFixed(2)}</span>
        </div>
      ) : null}
      <Separator />
      <div className={`flex justify-between ${totalClassName}`}>
        <span>Total</span>
        <span className="text-primary">${totals.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function CheckoutTotalsSummary({
  totals,
  totalClassName = "font-serif font-bold text-lg",
}: {
  totals: CheckoutTotalsPreview;
  totalClassName?: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span>
        <span>${totals.subtotal.toFixed(2)}</span>
      </div>
      {totals.tax > 0 ? (
        <div className="flex justify-between text-muted-foreground">
          <span>{totals.taxLabel?.trim() || "Sales Tax"}</span>
          <span>${totals.tax.toFixed(2)}</span>
        </div>
      ) : null}
      {totals.deliveryFee != null && totals.deliveryFee > 0 ? (
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery Fee</span>
          <span>${totals.deliveryFee.toFixed(2)}</span>
        </div>
      ) : null}
      <Separator />
      <div className={`flex justify-between ${totalClassName}`}>
        <span>Total</span>
        <span className="text-primary">${totals.total.toFixed(2)}</span>
      </div>
    </div>
  );
}
