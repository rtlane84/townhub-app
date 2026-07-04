import { useState } from "react";
import { useGetOrder, useUpdateOrderStatus, getGetOrderQueryKey, getListBusinessOrdersQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KitchenTicketPrint, printKitchenTicket } from "@/components/kitchen-ticket-print";
import { OrderRefundDialog } from "@/components/order-refund-dialog";
import { OrderTotalsSummary } from "@/components/order-totals-summary";
import {
  canIssueRefund,
  formatRefundAmount,
  formatRefundAmountCents,
  orderPaymentDisplayStatus,
  refundRecordStatusLabel,
  refundStatusLabel,
} from "@/lib/order-refund-display";
import {
  getBusinessOrderTimingLabel,
  getBusinessReadyWindowLabel,
} from "@/lib/order-prep-timing";

const STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
};

interface Props {
  params: { id: string };
}

export default function BusinessOrderDetail({ params }: Props) {
  const orderId = parseInt(params.id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [refundOpen, setRefundOpen] = useState(false);

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) },
  });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        if (updated.businessId) {
          queryClient.invalidateQueries({ queryKey: getListBusinessOrdersQueryKey(updated.businessId) });
        }
        toast({ title: "Status updated", description: `Order is now ${updated.status.replace(/_/g, " ")}` });
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    },
  });

  return (
    <BusinessDashboardLayout>
      {order ? <KitchenTicketPrint order={order} /> : null}
      <div className="max-w-3xl mx-auto space-y-6 print:hidden">
        <Link href="/dashboard/business/orders">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
          </span>
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !order ? (
          <div className="text-center py-16 text-muted-foreground">Order not found.</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-bold">{order.orderNumber}</h1>
                <p className="text-muted-foreground mt-1">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""} · {order.fulfillmentType}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getBusinessReadyWindowLabel(order)}
                  {(() => {
                    const timingLabel = getBusinessOrderTimingLabel(order);
                    if (!timingLabel) return null;
                    return (
                      <span className={timingLabel.startsWith("Overdue") ? " text-destructive font-medium" : ""}>
                        {" · "}
                        {timingLabel}
                      </span>
                    );
                  })()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printKitchenTicket}
                  data-testid="button-print-kitchen-ticket"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Ticket
                </Button>
              </div>
            </div>

            {/* Status update */}
            <Card>
              <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
              <CardContent>
                <Select
                  defaultValue={order.status}
                  onValueChange={(val) => updateStatus.mutate({ id: orderId, data: { status: val as never } })}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger className="w-64" data-testid="select-status" aria-busy={updateStatus.isPending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateStatus.isPending ? (
                  <p className="text-xs text-muted-foreground mt-2" role="status">Updating status…</p>
                ) : null}
              </CardContent>
            </Card>

            {/* Customer info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Customer</CardTitle>
                {!order.customerUserId ? (
                  <Badge variant="secondary">Guest checkout</Badge>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Name</span>
                  <span className="font-medium text-right">{order.customerName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Email</span>
                  <a href={`mailto:${order.customerEmail}`} className="font-medium text-right text-primary hover:underline">
                    {order.customerEmail}
                  </a>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Phone</span>
                  {order.customerPhone ? (
                    <a href={`tel:${order.customerPhone}`} className="font-medium text-right text-primary hover:underline">
                      {order.customerPhone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </div>
                {order.fulfillmentType === "DELIVERY" && order.deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery address</span>
                    <span className="font-medium text-right">{order.deliveryAddress}</span>
                  </div>
                )}
                {order.estimatedWindowStart && order.estimatedWindowEnd ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated ready</span>
                    <span className="font-medium text-right">
                      {getBusinessReadyWindowLabel(order).replace(/^ASAP · Ready around /, "")}
                    </span>
                  </div>
                ) : order.pickupTime ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickup time</span>
                    <span className="font-medium">{order.pickupTime}</span>
                  </div>
                ) : null}
                {order.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="text-foreground">{order.notes}</p>
                  </div>
                )}
                {order.specialFields && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Special instructions</p>
                    <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{order.specialFields}</pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order items */}
            <Card>
              <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm" data-testid={`item-${item.id}`}>
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                {order ? <OrderTotalsSummary order={order} totalClassName="font-bold font-serif text-base" /> : null}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Payment: <span className="font-medium text-foreground">{order.paymentMethod}</span></span>
                    <span>Status: <span className="font-medium text-foreground">{orderPaymentDisplayStatus(order)}</span></span>
                  </div>
                  {(order.refundedAmount ?? 0) > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Refunded so far: <span className="font-medium text-foreground">{formatRefundAmount(order.refundedAmount ?? 0)}</span>
                    </div>
                  ) : null}
                  {canIssueRefund(order) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRefundOpen(true)}
                      data-testid="button-issue-refund"
                    >
                      Issue refund
                    </Button>
                  ) : order.paymentMethod === "STRIPE" && order.paymentStatus !== "PAID" ? (
                    <p className="text-xs text-muted-foreground">
                      Refunds are available after online payment is confirmed.
                    </p>
                  ) : order.paymentMethod === "IN_PERSON" ? (
                    <p className="text-xs text-muted-foreground">
                      Pay-at-pickup orders are not refunded through Stripe.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {order.refunds?.length ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Refund history</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="rounded-md border p-3 text-sm space-y-1" data-testid={`refund-${refund.id}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{formatRefundAmountCents(refund.amountCents)}</span>
                        <Badge variant="outline">{refundRecordStatusLabel(refund.status)}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {refund.createdAt ? new Date(refund.createdAt).toLocaleString() : ""}
                        {refund.createdByName ? ` · ${refund.createdByName}` : ""}
                      </p>
                      {refund.reason ? <p>{refund.reason}</p> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {order.refundStatus && order.refundStatus !== "NONE" ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Refund status</CardTitle></CardHeader>
                <CardContent>
                  <Badge variant="secondary">{refundStatusLabel(order.refundStatus)}</Badge>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
      {order ? (
        <OrderRefundDialog order={order} open={refundOpen} onOpenChange={setRefundOpen} />
      ) : null}
    </BusinessDashboardLayout>
  );
}
