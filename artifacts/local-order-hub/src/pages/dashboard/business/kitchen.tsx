import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useUpdateOrderStatus,
  getGetBusinessOrderSummaryQueryKey,
  type Order,
} from "@workspace/api-client-react";
import { formatOrderTicketNumber } from "@workspace/api-zod";
import {
  getKitchenBusinessOrdersQueryKey,
  listKitchenBusinessOrders,
} from "@/lib/business-orders-api";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { BusinessOrderFiltersToolbar } from "@/components/business-order-filters-toolbar";
import { KitchenOrderCard } from "@/components/kitchen-order-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getOrderListDateSummary } from "@/lib/business-order-filters";
import {
  countKitchenPanelActiveFilters,
  kitchenWorkspaceHasActiveFilters,
} from "@/lib/business-order-workspace";
import { useBusinessKitchenWorkspace } from "@/hooks/use-business-kitchen-workspace";
import {
  KITCHEN_COLUMN_DEFS,
  KITCHEN_MOBILE_COLUMN_DEFS,
  applyKitchenDisplayFilters,
  filterActiveKitchenOrders,
  getKitchenDisplayFilterSummary,
  groupOrdersByKitchenColumn,
  groupOrdersByKitchenMobileColumn,
  isActiveKitchenOrder,
  type KitchenColumnId,
  type KitchenMobileColumnId,
} from "@/lib/kitchen-display";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { changeOrderStatusCopy } from "@/lib/confirm-action-copy";
import { orderStatusNeedsConfirmation } from "@/lib/order-status-safety";
import { Link } from "wouter";
import { ChefHat, Expand, Loader2, Minimize, RefreshCw, ShoppingBag } from "lucide-react";

const COLUMN_HEADER_CLASS: Record<KitchenColumnId, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  CONFIRMED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PREPARING: "bg-amber-100 text-amber-900 border-amber-200",
  READY: "bg-green-100 text-green-900 border-green-200",
};

const MOBILE_COLUMN_HEADER_CLASS: Record<KitchenMobileColumnId, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  CONFIRMED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PREPARING: "bg-amber-100 text-amber-900 border-amber-200",
  READY_FOR_PICKUP: "bg-green-100 text-green-900 border-green-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
};

function KitchenColumnBody({
  columnLabel,
  columnOrders,
  updatingId,
  onAdvance,
}: {
  columnLabel: string;
  columnOrders: Order[];
  updatingId: number | null;
  onAdvance: (orderId: number, nextStatus: string) => void;
}) {
  return (
    <div
      data-kitchen-column-scroll
      className="flex-1 space-y-3 min-h-[120px] max-h-[calc(100dvh-13rem)] overflow-y-auto pr-0.5 md:max-h-[calc(100vh-14rem)]"
    >
      {columnOrders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8 px-2 rounded-lg border border-dashed bg-background/50">
          No {columnLabel.toLowerCase()} orders
        </p>
      ) : (
        columnOrders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            updating={updatingId === order.id}
            onAdvance={onAdvance}
          />
        ))
      )}
    </div>
  );
}

function patchKitchenOrdersCache(
  queryClient: ReturnType<typeof useQueryClient>,
  businessId: number,
  orderId: number,
  nextStatus: string,
  serverOrder?: Order,
) {
  const queryKey = getKitchenBusinessOrdersQueryKey(businessId);
  queryClient.setQueryData<Order[]>(queryKey, (previous) => {
    if (!previous) return previous;

    const resolved = serverOrder ?? previous.find((order) => order.id === orderId);
    if (!resolved) return previous;

    const updated: Order = { ...resolved, ...serverOrder, status: serverOrder?.status ?? (nextStatus as Order["status"]) };

    if (!isActiveKitchenOrder(updated)) {
      return previous.filter((order) => order.id !== orderId);
    }

    return previous.map((order) => (order.id === orderId ? updated : order));
  });
}

export default function BusinessKitchen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const boardRef = useRef<HTMLDivElement>(null);
  const mobileBoardRef = useRef<HTMLDivElement>(null);
  const mobileBoardScrollRestoredRef = useRef(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<{
    orderId: number;
    orderLabel: string;
    nextStatus: string;
  } | null>(null);

  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;

  const {
    searchQuery,
    setSearchQuery,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    fulfillmentFilter,
    setFulfillmentFilter,
    paymentFilter,
    setPaymentFilter,
    filtersExpanded,
    setFiltersExpanded,
    mobileBoardScrollLeft,
    saveMobileBoardScrollLeft,
    clearFilters,
  } = useBusinessKitchenWorkspace(businessId);

  const {
    data: orders,
    isPending,
    isFetching,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: getKitchenBusinessOrdersQueryKey(businessId),
    queryFn: ({ signal }) => listKitchenBusinessOrders(businessId, { signal }),
    enabled: !!businessId,
    placeholderData: keepPreviousData,
  });

  const orderList = orders ?? [];

  const filterInput = useMemo(
    () => ({
      datePreset,
      customRange,
      searchQuery,
      fulfillmentFilter,
      paymentFilter,
    }),
    [datePreset, customRange, searchQuery, fulfillmentFilter, paymentFilter],
  );

  const filteredOrders = useMemo(
    () => applyKitchenDisplayFilters(orderList, filterInput),
    [orderList, filterInput],
  );

  const grouped = useMemo(() => groupOrdersByKitchenColumn(filteredOrders), [filteredOrders]);
  const mobileGrouped = useMemo(() => groupOrdersByKitchenMobileColumn(filteredOrders), [filteredOrders]);
  const totalActiveCount = useMemo(() => filterActiveKitchenOrders(orderList).length, [orderList]);
  const visibleCount = filteredOrders.length;
  const filtersActive = kitchenWorkspaceHasActiveFilters({
    searchQuery,
    datePreset,
    customRange,
    fulfillmentFilter,
    paymentFilter,
  });
  const activeFilterCount = countKitchenPanelActiveFilters({
    datePreset,
    customRange,
    fulfillmentFilter,
    paymentFilter,
  });
  const filterSummary = useMemo(() => {
    const countLine = getKitchenDisplayFilterSummary(visibleCount, totalActiveCount, filtersActive);
    const dateLine = getOrderListDateSummary(datePreset, customRange);
    return `${countLine} · ${dateLine}`;
  }, [visibleCount, totalActiveCount, filtersActive, datePreset, customRange]);

  const clearKitchenFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  useEffect(() => {
    mobileBoardScrollRestoredRef.current = false;
  }, [businessId]);

  useEffect(() => {
    const node = mobileBoardRef.current;
    if (!node || mobileBoardScrollRestoredRef.current) return;
    mobileBoardScrollRestoredRef.current = true;
    if (mobileBoardScrollLeft > 0) {
      requestAnimationFrame(() => {
        node.scrollLeft = mobileBoardScrollLeft;
      });
    }
  }, [mobileBoardScrollLeft, filteredOrders.length]);

  useEffect(() => {
    const node = mobileBoardRef.current;
    if (!node) return;

    let timeoutId = 0;
    const onScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        saveMobileBoardScrollLeft(node.scrollLeft);
      }, 150);
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.clearTimeout(timeoutId);
      saveMobileBoardScrollLeft(node.scrollLeft);
    };
  }, [saveMobileBoardScrollLeft, filteredOrders.length]);

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onMutate: async (vars) => {
        setUpdatingId(vars.id);
        const nextStatus = String(vars.data.status);
        await queryClient.cancelQueries({ queryKey: getKitchenBusinessOrdersQueryKey(businessId) });
        const previous = queryClient.getQueryData<Order[]>(getKitchenBusinessOrdersQueryKey(businessId));
        patchKitchenOrdersCache(queryClient, businessId, vars.id, nextStatus);
        return { previous };
      },
      onSuccess: (updated) => {
        if (updated.businessId) {
          patchKitchenOrdersCache(queryClient, updated.businessId, updated.id, updated.status, updated);
          queryClient.invalidateQueries({
            queryKey: getGetBusinessOrderSummaryQueryKey(updated.businessId),
          });
        }
        setUpdatingId(null);
        toast({
          title: "Order updated",
          description: `${formatOrderTicketNumber(updated.id)} is now ${updated.status.replace(/_/g, " ").toLowerCase()}`,
        });
        setStatusConfirm(null);
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getKitchenBusinessOrdersQueryKey(businessId), context.previous);
        }
        setUpdatingId(null);
        toast({ title: "Failed to update order", variant: "destructive" });
      },
    },
  });

  const handleAdvance = useCallback(
    (orderId: number, nextStatus: string) => {
      const targetOrder = orderList.find((o) => o.id === orderId);
      if (orderStatusNeedsConfirmation(nextStatus) && targetOrder) {
        setStatusConfirm({
          orderId,
          nextStatus,
          orderLabel: formatOrderTicketNumber(targetOrder.id),
        });
        return;
      }
      updateStatus.mutate({ id: orderId, data: { status: nextStatus as never } });
    },
    [updateStatus, orderList],
  );

  const confirmStatusChange = useCallback(() => {
    if (!statusConfirm) return;
    updateStatus.mutate({
      id: statusConfirm.orderId,
      data: { status: statusConfirm.nextStatus as never },
    });
  }, [statusConfirm, updateStatus]);

  const toggleFullscreen = useCallback(async () => {
    const el = boardRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast({ title: "Fullscreen unavailable", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === boardRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const lastUpdatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <BusinessDashboardLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" aria-hidden />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">Kitchen Display</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {business?.name ? `${business.name} · ` : ""}
              {visibleCount} on board
              {lastUpdatedLabel ? ` · Updated ${lastUpdatedLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => void toggleFullscreen()} data-testid="button-kitchen-fullscreen">
              {isFullscreen ? (
                <>
                  <Minimize className="h-4 w-4 mr-1.5" /> Exit fullscreen
                </>
              ) : (
                <>
                  <Expand className="h-4 w-4 mr-1.5" /> Fullscreen
                </>
              )}
            </Button>
            <Link href="/dashboard/business/orders">
              <Button variant="ghost" size="sm">
                <ShoppingBag className="h-4 w-4 mr-1.5" /> All orders
              </Button>
            </Link>
          </div>
        </div>

        <BusinessOrderFiltersToolbar
          variant="kitchen"
          testIdPrefix="kitchen"
          className="print:hidden"
          searchPlaceholder="Search order #, customer, phone, or email"
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          fulfillmentFilter={fulfillmentFilter}
          onFulfillmentFilterChange={setFulfillmentFilter}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={setPaymentFilter}
          filtersExpanded={filtersExpanded}
          onFiltersExpandedChange={setFiltersExpanded}
          activeFilterCount={activeFilterCount}
          filterSummary={filterSummary}
          filtersActive={filtersActive}
          onClearFilters={clearKitchenFilters}
        />

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            Could not load orders.{" "}
            <button type="button" className="underline font-medium" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : null}

        <div
          ref={boardRef}
          data-fullscreen={isFullscreen ? "true" : undefined}
          className={cn(
            "kitchen-display-board rounded-xl border bg-muted/20 p-3 sm:p-4",
            isFullscreen && "bg-background overflow-auto",
          )}
          data-testid="kitchen-display-board"
        >
          {isPending && orderList.length === 0 ? (
            <>
              <Skeleton className="h-64 w-full rounded-lg md:hidden" />
              <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {KITCHEN_COLUMN_DEFS.map((col) => (
                  <Skeleton key={col.id} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Mobile: one full-width column per swipe panel */}
              <div
                ref={mobileBoardRef}
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-3 px-3 pb-1 md:hidden"
                data-testid="kitchen-mobile-board"
              >
                {KITCHEN_MOBILE_COLUMN_DEFS.map((column) => {
                  const columnOrders = mobileGrouped[column.id];
                  return (
                    <section
                      key={column.id}
                      className="flex flex-[0_0_100%] snap-center flex-col"
                      aria-label={`${column.label} orders`}
                      data-testid={`kitchen-mobile-column-${column.id}`}
                    >
                      <header
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 mb-3 sticky top-0 z-10",
                          MOBILE_COLUMN_HEADER_CLASS[column.id],
                        )}
                      >
                        <h2 className="font-semibold text-sm">{column.label}</h2>
                        <span className="text-xs font-bold tabular-nums rounded-full bg-white/70 px-2 py-0.5 min-w-[1.5rem] text-center">
                          {columnOrders.length}
                        </span>
                      </header>

                      <KitchenColumnBody
                        columnLabel={column.label}
                        columnOrders={columnOrders}
                        updatingId={updatingId}
                        onAdvance={handleAdvance}
                      />
                    </section>
                  );
                })}
              </div>

              {/* Desktop: multi-column board (unchanged) */}
              <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 md:gap-4" data-testid="kitchen-desktop-board">
                {KITCHEN_COLUMN_DEFS.map((column) => {
                  const columnOrders = grouped[column.id];
                  return (
                    <section
                      key={column.id}
                      className="flex flex-col min-w-0"
                      aria-label={`${column.label} orders`}
                      data-testid={`kitchen-column-${column.id}`}
                    >
                      <header
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 mb-3 sticky top-0 z-10",
                          COLUMN_HEADER_CLASS[column.id],
                        )}
                      >
                        <h2 className="font-semibold text-sm">{column.label}</h2>
                        <span className="text-xs font-bold tabular-nums rounded-full bg-white/70 px-2 py-0.5 min-w-[1.5rem] text-center">
                          {columnOrders.length}
                        </span>
                      </header>

                      <KitchenColumnBody
                        columnLabel={column.label}
                        columnOrders={columnOrders}
                        updatingId={updatingId}
                        onAdvance={handleAdvance}
                      />
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={statusConfirm !== null}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        copy={
          statusConfirm
            ? changeOrderStatusCopy(statusConfirm.orderLabel, statusConfirm.nextStatus)
            : null
        }
        onConfirm={confirmStatusChange}
        loading={updateStatus.isPending}
        loadingText="Updating…"
      />
    </BusinessDashboardLayout>
  );
}
