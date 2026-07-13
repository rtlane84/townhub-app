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
import { BusinessLiveStatusIndicator } from "@/components/business-live-status-indicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { safeCancelQueries, safeInvalidateQueries } from "@/lib/query-cancellation";
import { orderStatusNeedsConfirmation } from "@/lib/order-status-safety";
import { KITCHEN_COLUMN_STATUS_HEADER_CLASS, ORDER_STATUS_DOT_CLASS } from "@/lib/order-status-colors";
import { useLocation } from "wouter";
import {
  ChefHat,
  Expand,
  Loader2,
  Minimize,
  MoreHorizontal,
  Monitor,
  RefreshCw,
  ShoppingBag,
  X,
} from "lucide-react";
import { useBusinessLiveEvents } from "@/hooks/business-live-events-provider";
import { resolveLiveIndicatorStatus } from "@/lib/business-live-indicator-status";
import { useKitchenDisplayMode } from "@/hooks/kitchen-display-mode";
import { useIsMobile } from "@/hooks/use-mobile";

const COLUMN_HEADER_CLASS = KITCHEN_COLUMN_STATUS_HEADER_CLASS;

function shortMobileLabel(columnId: KitchenMobileColumnId, label: string): string {
  if (columnId === "OUT_FOR_DELIVERY") return "Out";
  if (columnId === "READY_FOR_PICKUP") return "Ready";
  return label;
}

function mobileColumnDotClass(columnId: KitchenMobileColumnId): string {
  return ORDER_STATUS_DOT_CLASS[columnId];
}

function KitchenColumnBody({
  columnLabel,
  columnOrders,
  updatingId,
  onAdvance,
  nestedScroll = false,
}: {
  columnLabel: string;
  columnOrders: Order[];
  updatingId: number | null;
  onAdvance: (orderId: number, nextStatus: string) => void;
  /** Only use nested column scroll in fullscreen — otherwise the page scrolls. */
  nestedScroll?: boolean;
}) {
  return (
    <div
      data-kitchen-column-scroll={nestedScroll ? true : undefined}
      className={cn(
        "min-h-[120px] flex-1 space-y-3",
        nestedScroll &&
          "max-h-[calc(100dvh-13rem)] overflow-y-auto overscroll-y-contain touch-pan-y pr-0.5 md:max-h-[calc(100vh-14rem)]",
      )}
    >
      {columnOrders.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-background/50 px-2 py-8 text-center text-xs text-muted-foreground">
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

    const updated: Order = {
      ...resolved,
      ...serverOrder,
      status: serverOrder?.status ?? (nextStatus as Order["status"]),
    };

    if (!isActiveKitchenOrder(updated)) {
      return previous.filter((order) => order.id !== orderId);
    }

    return previous.map((order) => (order.id === orderId ? updated : order));
  });
}

export default function BusinessKitchen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const boardRef = useRef<HTMLDivElement>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileColumnId, setMobileColumnId] = useState<KitchenMobileColumnId>("NEW");
  const [statusConfirm, setStatusConfirm] = useState<{
    orderId: number;
    orderLabel: string;
    nextStatus: string;
  } | null>(null);

  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const { status: liveStatus, usePollingFallback } = useBusinessLiveEvents(
    businessId || undefined,
  );
  const liveIndicatorStatus = resolveLiveIndicatorStatus(liveStatus, usePollingFallback);
  const isMobile = useIsMobile();
  const {
    preferred: kitchenModePreferred,
    active: kitchenModeActive,
    setPreferred: setKitchenModePreferred,
  } = useKitchenDisplayMode();

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
  const mobileGrouped = useMemo(
    () => groupOrdersByKitchenMobileColumn(filteredOrders),
    [filteredOrders],
  );
  const totalActiveCount = useMemo(
    () => filterActiveKitchenOrders(orderList).length,
    [orderList],
  );
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
    const countLine = getKitchenDisplayFilterSummary(
      visibleCount,
      totalActiveCount,
      filtersActive,
    );
    const dateLine = getOrderListDateSummary(datePreset, customRange);
    return `${countLine} · ${dateLine}`;
  }, [visibleCount, totalActiveCount, filtersActive, datePreset, customRange]);

  const clearKitchenFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const mobileActiveColumn =
    KITCHEN_MOBILE_COLUMN_DEFS.find((column) => column.id === mobileColumnId) ??
    KITCHEN_MOBILE_COLUMN_DEFS[0];
  const mobileActiveOrders = mobileGrouped[mobileActiveColumn.id];

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onMutate: async (vars) => {
        setUpdatingId(vars.id);
        const nextStatus = String(vars.data.status);
        await safeCancelQueries(queryClient, {
          queryKey: getKitchenBusinessOrdersQueryKey(businessId),
        });
        const previous = queryClient.getQueryData<Order[]>(
          getKitchenBusinessOrdersQueryKey(businessId),
        );
        patchKitchenOrdersCache(queryClient, businessId, vars.id, nextStatus);
        return { previous };
      },
      onSuccess: (updated) => {
        if (updated.businessId) {
          patchKitchenOrdersCache(
            queryClient,
            updated.businessId,
            updated.id,
            updated.status,
            updated,
          );
          safeInvalidateQueries(queryClient, {
            queryKey: getGetBusinessOrderSummaryQueryKey(updated.businessId),
          });
        }
        setUpdatingId(null);
        toast({
          title: "Order updated",
          description: `${formatOrderTicketNumber(updated.id, "Order", updated.businessOrderNumber)} is now ${updated.status.replace(/_/g, " ").toLowerCase()}`,
        });
        setStatusConfirm(null);
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            getKitchenBusinessOrdersQueryKey(businessId),
            context.previous,
          );
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
          orderLabel: formatOrderTicketNumber(
            targetOrder.id,
            "Order",
            targetOrder.businessOrderNumber,
          ),
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
    ? new Date(dataUpdatedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <BusinessDashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-2.5">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <ChefHat className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <h1 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">
                Kitchen
              </h1>
              <BusinessLiveStatusIndicator
                status={liveIndicatorStatus}
                className="shrink-0"
              />
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {business?.name ? `${business.name} · ` : ""}
              {visibleCount} on board
              {lastUpdatedLabel ? ` · ${lastUpdatedLabel}` : ""}
              {kitchenModeActive ? " · Kitchen Mode" : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
            {kitchenModeActive ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 gap-1.5 rounded-full px-3"
                onClick={() => setKitchenModePreferred(false)}
                data-testid="button-exit-kitchen-mode"
              >
                <X className="h-4 w-4" aria-hidden />
                Exit
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  aria-label="Kitchen actions"
                  data-testid="button-kitchen-menu"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onSelect={() => setKitchenModePreferred(!kitchenModePreferred)}
                  data-testid="menu-kitchen-mode"
                >
                  <Monitor className="mr-2 h-4 w-4" aria-hidden />
                  {kitchenModePreferred ? "Exit Kitchen Mode" : "Kitchen Mode"}
                </DropdownMenuItem>
                {!isMobile ? (
                  <DropdownMenuItem
                    onSelect={() => void toggleFullscreen()}
                    data-testid="menu-kitchen-fullscreen"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="mr-2 h-4 w-4" aria-hidden />
                        Exit fullscreen
                      </>
                    ) : (
                      <>
                        <Expand className="mr-2 h-4 w-4" aria-hidden />
                        Fullscreen
                      </>
                    )}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onSelect={() => void refetch()}
                  disabled={isFetching}
                  data-testid="menu-kitchen-refresh"
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setLocation("/dashboard/business/orders")}
                  data-testid="menu-kitchen-all-orders"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
                  All orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <BusinessOrderFiltersToolbar
          variant="kitchen"
          testIdPrefix="kitchen"
          density="compact"
          className="print:hidden"
          searchPlaceholder="Search order #, customer, phone…"
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
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            Could not load orders.{" "}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => void refetch()}
            >
              Try again
            </button>
          </div>
        ) : null}

        <div
          ref={boardRef}
          data-fullscreen={isFullscreen ? "true" : undefined}
          className={cn(
            "kitchen-display-board rounded-xl border bg-muted/15 p-2 sm:p-3",
            isFullscreen && "overflow-auto bg-background",
          )}
          data-testid="kitchen-display-board"
        >
          {isPending && orderList.length === 0 ? (
            <>
              <Skeleton className="h-64 w-full rounded-lg md:hidden" />
              <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
                {KITCHEN_COLUMN_DEFS.map((col) => (
                  <Skeleton key={col.id} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Mobile / tablet portrait: segmented status + list */}
              <div className="md:hidden" data-testid="kitchen-mobile-board">
                <div
                  role="tablist"
                  aria-label="Kitchen status"
                  className="mb-2 flex gap-0.5 overflow-x-auto rounded-lg bg-muted/80 p-0.5 hide-scrollbar"
                >
                  {KITCHEN_MOBILE_COLUMN_DEFS.map((column) => {
                    const count = mobileGrouped[column.id].length;
                    const active = column.id === mobileColumnId;
                    const shortLabel = shortMobileLabel(column.id, column.label);
                    return (
                      <button
                        key={column.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setMobileColumnId(column.id)}
                        className={cn(
                          "inline-flex min-h-10 min-w-[3.25rem] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 transition-colors",
                          active
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                        data-testid={`kitchen-mobile-tab-${column.id}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", mobileColumnDotClass(column.id))}
                            aria-hidden
                          />
                          <span className="text-sm font-bold tabular-nums leading-none">
                            {count}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-[10px] font-medium leading-none">
                          {shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <section
                  aria-label={`${mobileActiveColumn.label} orders`}
                  data-testid={`kitchen-mobile-column-${mobileActiveColumn.id}`}
                  className="touch-pan-y space-y-2.5 pb-4"
                >
                  {mobileActiveOrders.length === 0 ? (
                    <p className="rounded-lg border border-dashed bg-background/50 px-2 py-8 text-center text-xs text-muted-foreground">
                      No {mobileActiveColumn.label.toLowerCase()} orders
                    </p>
                  ) : (
                    mobileActiveOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        updating={updatingId === order.id}
                        onAdvance={handleAdvance}
                      />
                    ))
                  )}
                </section>
              </div>

              {/* Desktop: multi-column board */}
              <div
                className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4"
                data-testid="kitchen-desktop-board"
              >
                {KITCHEN_COLUMN_DEFS.map((column) => {
                  const columnOrders = grouped[column.id];
                  return (
                    <section
                      key={column.id}
                      className="flex min-w-0 flex-col"
                      aria-label={`${column.label} orders`}
                      data-testid={`kitchen-column-${column.id}`}
                    >
                      <header
                        className={cn(
                          "mb-2 flex items-center justify-between rounded-lg border px-2.5 py-1.5",
                          isFullscreen && "sticky top-0 z-10",
                          COLUMN_HEADER_CLASS[column.id],
                        )}
                      >
                        <h2 className="text-sm font-semibold">{column.label}</h2>
                        <span className="min-w-[1.5rem] rounded-full bg-white/70 px-2 py-0.5 text-center text-xs font-bold tabular-nums">
                          {columnOrders.length}
                        </span>
                      </header>

                      <KitchenColumnBody
                        columnLabel={column.label}
                        columnOrders={columnOrders}
                        updatingId={updatingId}
                        onAdvance={handleAdvance}
                        nestedScroll={isFullscreen}
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
