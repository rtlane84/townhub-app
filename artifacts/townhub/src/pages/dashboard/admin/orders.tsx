import { useState } from "react";
import { useListAllOrders, getListAllOrdersQueryKey } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { formatOrderTicketNumber, formatOrderReferenceLabel } from "@workspace/api-zod";
import { ORDER_STATUS_BADGE_CLASS, orderStatusBadgeClass } from "@/lib/order-status-colors";
import { cn } from "@/lib/utils";

const ALL_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"] as const;

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders, isLoading } = useListAllOrders();

  const filtered = statusFilter === "all"
    ? (orders ?? [])
    : (orders ?? []).filter((o) => o.status === statusFilter);

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">All Orders</h1>
          <p className="text-muted-foreground mt-1">Platform-wide order view</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            All ({orders?.length ?? 0})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = orders?.filter((o) => o.status === s).length ?? 0;
            const selected = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selected
                    ? ORDER_STATUS_BADGE_CLASS[s]
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
                data-testid={`filter-${s.toLowerCase()}`}
              >
                {s.replace(/_/g, " ")} ({count})
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-serif text-lg">No orders found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4" data-testid={`row-order-${order.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm">{formatOrderTicketNumber(order.id, "Order", order.businessOrderNumber)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orderStatusBadgeClass(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.orderNumber ? `${formatOrderReferenceLabel(order.orderNumber)} · ` : ""}
                        {order.businessName} · {order.customerName} · {order.fulfillmentType} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-sm">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
