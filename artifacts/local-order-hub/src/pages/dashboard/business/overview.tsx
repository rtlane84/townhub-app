import { keepPreviousData } from "@tanstack/react-query";
import { useGetBusinessOrderSummary, getGetBusinessOrderSummaryQueryKey } from "@workspace/api-client-react";
import { formatOrderTicketNumber } from "@workspace/api-zod";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ShoppingBag, Clock, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { OrderRow, orderStatusHighlightClass } from "@/components/order-row";
import { useOrderHighlight } from "@/hooks/order-dashboard-refresh-context";
import { cn } from "@/lib/utils";
import { LockedFeatureSection } from "@/components/locked-feature-section";
import { useBusinessFeatureAccess } from "@/hooks/business-feature-access";
import { OverviewStatCard } from "@/components/overview-stat-card";
import {
  OVERVIEW_KITCHEN_HREF,
  OVERVIEW_ORDERS_LINKS,
} from "@/lib/business-order-list-url";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY_FOR_PICKUP: "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
};

function OverviewOrderStatus({ orderId, status }: { orderId: number; status: string }) {
  const highlight = useOrderHighlight(orderId);
  return (
    <span
      className={cn(
        "text-xs px-2 py-1 rounded-full font-medium",
        STATUS_COLORS[status] ?? "bg-muted",
        orderStatusHighlightClass(highlight),
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function BusinessOverview() {
  const { selectedBusinessId, business, isLoading: selectionLoading } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;

  const { data: summary, isPending: summaryPending, isFetching } = useGetBusinessOrderSummary(businessId, {
    query: {
      enabled: !!businessId,
      queryKey: getGetBusinessOrderSummaryQueryKey(businessId),
      placeholderData: keepPreviousData,
    },
  });

  const showInitialSkeleton = (selectionLoading && !businessId) || (summaryPending && !summary);
  const { hasFeature, openLockedFeature } = useBusinessFeatureAccess();
  const ordersLocked = !hasFeature("online_ordering");

  return (
    <BusinessDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Overview</h1>
            <p className="text-muted-foreground mt-1">
              {business?.name ? `${business.name} at a glance` : "Your business at a glance"}
            </p>
          </div>
          {isFetching && summary && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pt-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Updating
            </span>
          )}
        </div>

        <LockedFeatureSection featureKey="online_ordering">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {showInitialSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <OverviewStatCard
                href={OVERVIEW_ORDERS_LINKS.today}
                locked={ordersLocked}
                onLockedClick={() => openLockedFeature("online_ordering")}
                testId="stat-today-orders"
                value={summary?.todayCount ?? 0}
                label="Orders today"
                icon={
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                }
              />
              <OverviewStatCard
                href={OVERVIEW_KITCHEN_HREF}
                locked={ordersLocked}
                onLockedClick={() => openLockedFeature("online_ordering")}
                testId="stat-pending-orders"
                value={summary?.pendingCount ?? 0}
                label="Pending"
                icon={
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                }
              />
              <OverviewStatCard
                href={OVERVIEW_ORDERS_LINKS.todayCompleted}
                locked={ordersLocked}
                onLockedClick={() => openLockedFeature("online_ordering")}
                testId="stat-today-revenue"
                value={`$${(summary?.todayRevenue ?? 0).toFixed(2)}`}
                label="Today's revenue"
                icon={
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                }
              />
              <OverviewStatCard
                href={OVERVIEW_ORDERS_LINKS.active}
                locked={ordersLocked}
                onLockedClick={() => openLockedFeature("online_ordering")}
                testId="stat-upcoming-orders"
                value={summary?.upcomingCount ?? 0}
                label="Upcoming"
                icon={
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                }
              />
            </>
          )}
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Recent Orders</CardTitle>
            {ordersLocked ? (
              <button
                type="button"
                className="text-sm text-muted-foreground font-medium cursor-not-allowed"
                onClick={() => openLockedFeature("online_ordering")}
              >
                View all
              </button>
            ) : (
              <Link href="/dashboard/business/orders">
                <span className="text-sm text-primary font-medium hover:underline cursor-pointer">View all</span>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {showInitialSkeleton ? (
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
                    <OrderRow
                      orderId={order.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-sm">{formatOrderTicketNumber(order.id)}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName} · {order.fulfillmentType}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">${order.total.toFixed(2)}</span>
                        <OverviewOrderStatus orderId={order.id} status={order.status} />
                      </div>
                    </OrderRow>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </LockedFeatureSection>
      </div>
    </BusinessDashboardLayout>
  );
}
