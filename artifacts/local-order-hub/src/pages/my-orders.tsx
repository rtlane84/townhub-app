import { Link } from "wouter";
import { useListMyOrders, getListMyOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Package } from "lucide-react";
import { formatOrderPaymentLabel } from "@/lib/stripe-checkout-return";
import { formatOrderTicketNumber, formatOrderReferenceLabel } from "@workspace/api-zod";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default function MyOrders() {
  const { data: orders, isLoading } = useListMyOrders({
    query: { queryKey: getListMyOrdersQueryKey() },
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground mt-2">
          Orders placed while signed in to your account. Guest checkouts are not listed here.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !orders?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-serif text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">
              When you place an order while signed in, it will show up here.
            </p>
            <Link href="/businesses">
              <span className="text-primary font-medium hover:underline">Browse businesses</span>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/my-orders/${order.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-serif font-semibold text-lg truncate">{order.businessName}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-muted"}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatOrderTicketNumber(order.id)}
                      {order.orderNumber ? ` · ${formatOrderReferenceLabel(order.orderNumber)}` : ""}
                      {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleString()}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}</Badge>
                      <Badge variant="secondary">
                        {formatOrderPaymentLabel(order.paymentMethod, order.paymentStatus)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif font-bold text-lg text-primary">${order.total.toFixed(2)}</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
