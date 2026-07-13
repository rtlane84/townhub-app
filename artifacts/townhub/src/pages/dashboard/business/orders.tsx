import { useEffect, useMemo, useRef } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useListBusinessOrders, getListBusinessOrdersQueryKey, type Order } from "@workspace/api-client-react";
import { formatOrderTicketNumber } from "@workspace/api-zod";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { BusinessOrderFiltersToolbar } from "@/components/business-order-filters-toolbar";
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
  getBusinessOrderTimingLabel,
  getBusinessReadyWindowLabel,
} from "@/lib/order-prep-timing";
import {
  applyBusinessOrderListFilters,
  filterOrdersForQueueSummary,
  getOrderListDateSummary,
  getOrderListEmptyState,
  countActiveOrdersOutsideDateRange,
  hasQueueScopeFilters,
} from "@/lib/business-order-filters";
import { parseOrdersPageSearch } from "@/lib/business-order-list-url";
import {
  countOrdersPanelActiveFilters,
  ordersWorkspaceHasActiveFilters,
} from "@/lib/business-order-workspace";
import { useBusinessOrdersWorkspace } from "@/hooks/use-business-orders-workspace";
import { orderStatusBadgeClass } from "@/lib/order-status-colors";
import { cn } from "@/lib/utils";

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

function OrderStatusBadge({ orderId, status }: { orderId: number; status: string }) {
  const highlight = useOrderHighlight(orderId);
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded-full font-medium",
        orderStatusBadgeClass(status),
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
  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;

  const {
    searchQuery,
    setSearchQuery,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    statusFilter,
    setStatusFilter,
    fulfillmentFilter,
    setFulfillmentFilter,
    paymentFilter,
    setPaymentFilter,
    filtersExpanded,
    setFiltersExpanded,
    applyWorkspacePatch,
    clearFilters,
  } = useBusinessOrdersWorkspace(businessId);

  const urlAppliedRef = useRef(false);
  useEffect(() => {
    if (urlAppliedRef.current) return;
    urlAppliedRef.current = true;
    const { datePreset: urlDate, statusFilter: urlStatus } = parseOrdersPageSearch(
      window.location.search,
    );
    if (urlDate || urlStatus) {
      applyWorkspacePatch({
        ...(urlDate ? { datePreset: urlDate } : {}),
        ...(urlStatus ? { statusFilter: urlStatus } : {}),
      });
    }
  }, [applyWorkspacePatch]);

  const { data: orders, isPending, isFetching, isError, error, refetch } = useListBusinessOrders(
    businessId,
    undefined,
    {
      query: {
        enabled: !!businessId,
        queryKey: getListBusinessOrdersQueryKey(businessId),
        placeholderData: keepPreviousData,
      },
    },
  );

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
        fulfillmentFilter,
        paymentFilter,
      }),
    [orderList, datePreset, customRange, statusFilter, searchQuery, fulfillmentFilter, paymentFilter],
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

  const filtersActive = ordersWorkspaceHasActiveFilters({
    searchQuery,
    datePreset,
    customRange,
    statusFilter,
    fulfillmentFilter,
    paymentFilter,
  });

  const activeFilterCount = countOrdersPanelActiveFilters({
    datePreset,
    customRange,
    statusFilter,
    fulfillmentFilter,
    paymentFilter,
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
    setStatusFilter(statusFilter === status ? "all" : status);
  };

  const queueCountsReflectFilters = hasQueueScopeFilters({
    datePreset,
    searchQuery,
    customRange,
  });

  return (
    <BusinessDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
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
          <BusinessOrderFiltersToolbar
            variant="orders"
            testIdPrefix="order-list"
            searchPlaceholder="Search orders..."
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fulfillmentFilter={fulfillmentFilter}
            onFulfillmentFilterChange={setFulfillmentFilter}
            paymentFilter={paymentFilter}
            onPaymentFilterChange={setPaymentFilter}
            filtersExpanded={filtersExpanded}
            onFiltersExpandedChange={setFiltersExpanded}
            activeFilterCount={activeFilterCount}
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
                  const readyWindow = getBusinessReadyWindowLabel(order);
                  const timingLabel = getBusinessOrderTimingLabel(order);

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
                            <p className="font-medium text-sm">{formatOrderTicketNumber(order.id, "Order", order.businessOrderNumber)}</p>
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
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {readyWindow}
                            {timingLabel ? ` · ${timingLabel}` : ""}
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
