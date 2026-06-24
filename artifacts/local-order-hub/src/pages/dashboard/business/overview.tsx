import { useGetMe, useGetBusinessOrderSummary, getGetBusinessOrderSummaryQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ShoppingBag, Clock, DollarSign, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
};

export default function BusinessOverview() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const businessId = me?.businessId ?? 0;

  const { data: summary, isLoading: summaryLoading } = useGetBusinessOrderSummary(businessId, {
    query: {
      enabled: !!businessId,
      queryKey: getGetBusinessOrderSummaryQueryKey(businessId),
    },
  });

  const isLoading = meLoading || summaryLoading;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Your business at a glance</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <Card data-testid="stat-today-orders">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-serif font-bold">{summary?.todayCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Orders today</p>
                </CardContent>
              </Card>
              <Card data-testid="stat-pending-orders">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-serif font-bold">{summary?.pendingCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Pending</p>
                </CardContent>
              </Card>
              <Card data-testid="stat-today-revenue">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-serif font-bold">${(summary?.todayRevenue ?? 0).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Today's revenue</p>
                </CardContent>
              </Card>
              <Card data-testid="stat-upcoming-orders">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-serif font-bold">{summary?.upcomingCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Upcoming</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Recent Orders</CardTitle>
            <Link href="/dashboard/business/orders">
              <span className="text-sm text-primary font-medium hover:underline cursor-pointer">View all</span>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !summary?.recentOrders?.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No orders yet. Share your storefront to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.recentOrders.map((order) => (
                  <Link key={order.id} href={`/dashboard/business/orders/${order.id}`}>
                    <div className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer" data-testid={`row-order-${order.id}`}>
                      <div>
                        <p className="font-medium text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName} · {order.fulfillmentType}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">${order.total.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
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
