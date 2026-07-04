import { Link, useRoute } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Store, MapPin } from "lucide-react";
import { customerRefundSummary, orderPaymentDisplayStatus } from "@/lib/order-refund-display";

export default function MyOrderDetail() {
  const [, params] = useRoute("/my-orders/:id");
  const orderId = Number(params?.id);

  const { data: order, isLoading, error } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-48 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <h2 className="text-2xl font-serif font-bold mb-2">Order not available</h2>
        <p className="text-muted-foreground mb-6">
          This order may belong to another account or is no longer available.
        </p>
        <Link href="/my-orders">
          <Button variant="outline">Back to My Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
      <Link href="/my-orders">
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Orders
        </span>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground mt-1">
            {order.businessName}
            {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleString()}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="uppercase tracking-wide">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif">Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="font-medium flex items-center gap-1.5">
              {order.fulfillmentType === "DELIVERY" ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <Store className="h-3.5 w-3.5" />
              )}
              {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
            </span>
          </div>
          {order.fulfillmentType === "DELIVERY" && order.deliveryAddress ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right">{order.deliveryAddress}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">
              {orderPaymentDisplayStatus(order)}
            </span>
          </div>
          {customerRefundSummary(order) ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Refund</span>
              <span className="font-medium text-right">{customerRefundSummary(order)}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                <span className="text-muted-foreground mr-2">{item.quantity}×</span>
                {item.productName}
              </span>
              <span className="font-medium">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-serif font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">${order.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
