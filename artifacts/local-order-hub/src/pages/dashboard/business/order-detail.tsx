import { useGetOrder, useUpdateOrderStatus, getGetOrderQueryKey, getListBusinessOrdersQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      <div className="max-w-3xl mx-auto space-y-6">
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-serif text-3xl font-bold">{order.orderNumber}</h1>
                <p className="text-muted-foreground mt-1">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""} · {order.fulfillmentType}
                </p>
              </div>
              <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                {order.status.replace(/_/g, " ")}
              </span>
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
                  <SelectTrigger className="w-64" data-testid="select-status">
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
                {order.pickupTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pickup time</span>
                    <span className="font-medium">{order.pickupTime}</span>
                  </div>
                )}
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
                <div className="space-y-2 text-sm">
                  {order.deliveryFee ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery fee</span>
                      <span>${order.deliveryFee.toFixed(2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold font-serif text-base">
                    <span>Total</span>
                    <span className="text-primary">${order.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span>Payment: <span className="font-medium text-foreground">{order.paymentMethod}</span></span>
                  <span>Status: <span className="font-medium text-foreground">{order.paymentStatus}</span></span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
