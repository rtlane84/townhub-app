import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useListBusinessOrders, getListBusinessOrdersQueryKey, type Order } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { BusinessOrderListToolbar } from "@/components/business-order-list-toolbar";
import { BusinessOrderQueueSummary } from "@/components/business-order-queue-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChevronRight, Loader2, Phone } from "lucide-react";
import { OrderRow, orderStatusHighlightClass } from "@/components/order-row";
import { useOrderHighlight } from "@/hooks/order-dashboard-refresh-context";
import {
  computeQueueCounts,
  customerPhoneTelHref,
  formatOrderRelativeTime,
  fulfillmentLabel,
  getBusinessOrderPaymentFlag,
  PAYMENT_FLAG_BADGE_BASE,
  PAYMENT_FLAG_DOT_STYLES,
  PAYMENT_FLAG_LABELS,
  type QueueSummaryStatus,
} from "@/lib/business-order-display";
import {
  applyBusinessOrderListFilters,
  filterOrdersForQueueSummary,
  getOrderListDateSummary,
  getOrderListEmptyState,
  countActiveOrdersOutsideDateRange,
  hasActiveBusinessOrderFilters,
  hasQueueScopeFilters,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "@/lib/business-order-filters";
import { cn } from "@/lib/utils";

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

function OrderStatusBadge({ orderId, status }: { orderId: number; status: string }) {
  const highlight = useOrderHighlight(orderId);
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        STATUS_COLORS[status] ?? "bg-muted",
        orderStatusHighlightClass(highlight),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function PaymentStatusBadge({
  paymentMethod,
  paymentStatus,
}: {
  paymentMethod?: string;
  paymentStatus?: string;
}) {
  const flag = getBusinessOrderPaymentFlag(paymentMethod, paymentStatus);
  return (
    <span
      className={PAYMENT_FLAG_BADGE_BASE}
      aria-label={`Payment: ${PAYMENT_FLAG_LABELS[flag]}`}
      data-testid={`payment-flag-${flag.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", PAYMENT_FLAG_DOT_STYLES[flag])}
        aria-hidden
      />
      {PAYMENT_FLAG_LABELS[flag]}
    </span>
  );
}

export default function BusinessOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<OrderDateFilterPreset>("today");
  const [customRange, setCustomRange] = useState<OrderCustomDateRange>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;

  const { data: orders, isPending, isFetching, isError, error, refetch } = useListBusinessOrders(businessId, {
    query: {
      enabled: !!businessId,
      queryKey: getListBusinessOrdersQueryKey(businessId),
      placeholderData: keepPreviousData,
    },
  });

  const lastOrdersRef = useRef<Order[]>([]);
  const orderList = useMemo(() => {
    if (Array.isArray(orders)) {
      lastOrdersRef.current = orders;
      return orders;
    }
    return lastOrdersRef.current;
  }, [orders]);
  const ordersForQueueCounts = useMemo(
    () =>
      filterOrdersForQueueSummary(orderList, {
        datePreset,
        customRange,
        searchQuery,
      }),
    [orderList, datePreset, customRange, searchQuery],
  );
  const queueCounts = useMemo(() => computeQueueCounts(ordersForQueueCounts), [ordersForQueueCounts]);

  const filtered = useMemo(
    () =>
      applyBusinessOrderListFilters(orderList, {
        datePreset,
        customRange,
        statusFilter,
        searchQuery,
      }),
    [orderList, datePreset, customRange, statusFilter, searchQuery],
  );

  const dateSummary = useMemo(
    () =>
      getOrderListDateSummary(
        datePreset,
        customRange,
        countActiveOrdersOutsideDateRange(orderList, datePreset, customRange),
      ),
    [datePreset, customRange, orderList],
  );

  const emptyState = useMemo(
    () =>
      getOrderListEmptyState({
        totalOrders: orderList.length,
        searchQuery,
        statusFilter,
        datePreset,
      }),
    [orderList.length, searchQuery, statusFilter, datePreset],
  );

  const filtersActive = hasActiveBusinessOrderFilters({
    statusFilter,
    datePreset,
    searchQuery,
    customRange,
  });

  const filterSummary = useMemo(() => {
    const countLine = `Showing ${filtered.length} of ${orderList.length} orders${filtersActive ? " (filtered)" : ""}`;
    return `${countLine} · ${dateSummary}`;
  }, [filtered.length, orderList.length, filtersActive, dateSummary]);

  const showInitialSkeleton = isPending && !orders && !lastOrdersRef.current.length;

  useEffect(() => {
    if (businessId && !isPending && !Array.isArray(orders)) {
      void refetch();
    }
  }, [businessId, isPending, orders, refetch]);

  const handleQueueSelect = (status: QueueSummaryStatus) => {
    setStatusFilter((current) => (current === status ? "all" : status));
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setDatePreset("today");
    setCustomRange({});
    setSearchQuery("");
  };

  const queueCountsReflectFilters = hasQueueScopeFilters({
    datePreset,
    searchQuery,
    customRange,
  });

  return (
    <BusinessDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground mt-1">
              {business?.name ? `${business.name} · ` : ""}
              Manage active orders and recent order history
            </p>
          </div>
          {isFetching && orders && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pt-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Updating
            </span>
          )}
        </div>

        {!showInitialSkeleton && (
          <BusinessOrderQueueSummary
            counts={queueCounts}
            activeStatus={statusFilter}
            onSelectStatus={handleQueueSelect}
            reflectsFilters={queueCountsReflectFilters}
          />
        )}

        {!showInitialSkeleton && (
          <BusinessOrderListToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterSummary={filterSummary}
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
          />
        )}

        <Card>
          <CardContent className="p-0">
            {showInitialSkeleton ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground px-6">
                {isError ? (
                  <>
                    <p className="text-lg font-serif">Could not load orders</p>
                    <p className="text-sm mt-1 max-w-md mx-auto">
                      {error instanceof Error ? error.message : "Try refreshing the page."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-serif">{emptyState.title}</p>
                    <p className="text-sm mt-1 max-w-md mx-auto">{emptyState.description}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((order) => {
                  const phone = order.customerPhone?.trim();
                  const telHref = phone ? customerPhoneTelHref(phone) : "";
                  const placedAt = order.createdAt ? formatOrderRelativeTime(order.createdAt) : "";

                  return (
                    <OrderRow
                      key={order.id}
                      orderId={order.id}
                      className="flex items-center gap-2 p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                    >
                      <Link
                        href={`/dashboard/business/orders/${order.id}`}
                        className="flex flex-1 min-w-0 items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <p className="font-medium text-sm">{order.orderNumber}</p>
                            <OrderStatusBadge orderId={order.id} status={order.status} />
                            <PaymentStatusBadge
                              paymentMethod={order.paymentMethod}
                              paymentStatus={order.paymentStatus}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.customerName}
                            {" · "}
                            {fulfillmentLabel(order.fulfillmentType)}
                            {placedAt ? ` · ${placedAt}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-sm">${order.total.toFixed(2)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                      {phone && telHref ? (
                        <a
                          href={telHref}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary hover:bg-primary/5 hover:border-primary/30 transition-colors"
                          aria-label={`Call ${order.customerName}`}
                          data-testid={`call-customer-${order.id}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      ) : null}
                    </OrderRow>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BusinessDashboardLayout>
  );
}
