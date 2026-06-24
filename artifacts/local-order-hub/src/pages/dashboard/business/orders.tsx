import { useState } from "react";
import { useGetMe, useListBusinessOrders, getListBusinessOrdersQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

const ALL_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function BusinessOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: me } = useGetMe();
  const businessId = me?.businessId ?? 0;

  const { data: orders, isLoading } = useListBusinessOrders(businessId, {
    query: {
      enabled: !!businessId,
      queryKey: getListBusinessOrdersQueryKey(businessId),
    },
  });

  const filtered = statusFilter === "all"
    ? (orders ?? [])
    : (orders ?? []).filter((o) => o.status === statusFilter);

  return (
    <BusinessDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders</p>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            data-testid="filter-all"
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              data-testid={`filter-${s.toLowerCase()}`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-serif">No orders found</p>
                <p className="text-sm mt-1">
                  {statusFilter === "all" ? "Orders will appear here once customers place them." : `No orders with status "${statusLabel(statusFilter)}".`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((order) => (
                  <Link key={order.id} href={`/dashboard/business/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`row-order-${order.id}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm">{order.orderNumber}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                            {statusLabel(order.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.customerName} · {order.fulfillmentType} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-sm">${order.total.toFixed(2)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessDashboardLayout>
  );
}
