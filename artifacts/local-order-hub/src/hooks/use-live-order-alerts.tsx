import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getBusinessOrderSummary,
  getGetBusinessOrderSummaryQueryKey,
  type Order,
  type BusinessOrderSummary,
} from "@workspace/api-client-react";
import {
  getKitchenBusinessOrdersQueryKey,
  listKitchenBusinessOrders,
} from "@/lib/business-orders-api";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { orderAlertDescription } from "@/lib/order-alert-format";
import {
  detectOrderListChanges,
  orderListsEqual,
  orderSummariesEqual,
} from "@/lib/order-dashboard-sync";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sounds";

export const OWNER_ORDER_POLL_INTERVAL_MS = 12_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

function maxOrderId(orders: Order[]): number {
  if (!orders.length) return 0;
  return Math.max(...orders.map((o) => o.id));
}

function playOrderAlertSound(businessId: number): void {
  const prefs = getNotificationPreferences(businessId);
  if (!prefs.soundsEnabled) return;
  unlockNotificationSound();
  playNotificationSound(prefs.volume);
}

export function useLiveOrderAlerts(businessId: number | undefined) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { markHighlights, addNewOrderBanners } = useOrderDashboardRefreshActions();

  const baselineSetRef = useRef(false);
  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const pollingRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);

  const syncDashboardCache = useCallback(
    (orders: Order[], summary: BusinessOrderSummary) => {
      if (!Array.isArray(orders) || !summary) return;

      const listKey = getKitchenBusinessOrdersQueryKey(businessId!);
      const summaryKey = getGetBusinessOrderSummaryQueryKey(businessId!);

      const previousOrders = queryClient.getQueryData<Order[]>(listKey);
      const changes = detectOrderListChanges(previousOrders, orders);

      if (!orderListsEqual(previousOrders, orders)) {
        queryClient.setQueryData(listKey, orders);
      }

      const previousSummary = queryClient.getQueryData<BusinessOrderSummary>(summaryKey);
      if (!orderSummariesEqual(previousSummary, summary)) {
        queryClient.setQueryData(summaryKey, summary);
      }

      if (changes.newOrderIds.length || changes.updatedOrderIds.length) {
        markHighlights(changes.newOrderIds, changes.updatedOrderIds);
      }
    },
    [businessId, markHighlights, queryClient],
  );

  const showNewOrderAlert = useCallback(
    (order: Order) => {
      toast({
        title: "New order received",
        description: orderAlertDescription(order),
        action: (
          <ToastAction
            altText="View order"
            onClick={() => setLocation(`/dashboard/business/orders/${order.id}`)}
          >
            View order
          </ToastAction>
        ),
      });

      if (businessId) {
        playOrderAlertSound(businessId);
      }
    },
    [businessId, setLocation, toast],
  );

  const showMultipleOrdersAlert = useCallback(
    (newOrders: Order[]) => {
      const latest = newOrders[newOrders.length - 1]!;
      toast({
        title: `${newOrders.length} new orders`,
        description: `Latest: ${orderAlertDescription(latest)}`,
        action: (
          <ToastAction
            altText="View orders"
            onClick={() => setLocation("/dashboard/business/orders")}
          >
            View orders
          </ToastAction>
        ),
      });

      if (businessId) {
        playOrderAlertSound(businessId);
      }
    },
    [businessId, setLocation, toast],
  );

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (cancelled || pollingRef.current || document.hidden) return;
      if (Date.now() < rateLimitedUntilRef.current) return;
      pollingRef.current = true;

      try {
        const staleTime = OWNER_ORDER_POLL_INTERVAL_MS - 1_000;
        const [orders, summary] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: getKitchenBusinessOrdersQueryKey(businessId),
            queryFn: ({ signal }) => listKitchenBusinessOrders(businessId, { signal }),
            staleTime,
          }),
          queryClient.fetchQuery({
            queryKey: getGetBusinessOrderSummaryQueryKey(businessId),
            queryFn: () => getBusinessOrderSummary(businessId),
            staleTime,
          }),
        ]);

        if (cancelled) return;

        if (!baselineSetRef.current) {
          latestKnownIdRef.current = maxOrderId(orders);
          baselineSetRef.current = true;
          syncDashboardCache(orders, summary);
          return;
        }

        const newOrders = orders
          .filter((o) => o.id > latestKnownIdRef.current && !alertedIdsRef.current.has(o.id))
          .sort((a, b) => a.id - b.id);

        if (newOrders.length === 1) {
          showNewOrderAlert(newOrders[0]!);
        } else if (newOrders.length > 1) {
          showMultipleOrdersAlert(newOrders);
        }

        if (newOrders.length > 0) {
          addNewOrderBanners(newOrders);
        }

        for (const order of newOrders) {
          alertedIdsRef.current.add(order.id);
        }

        if (newOrders.length > 0) {
          latestKnownIdRef.current = Math.max(latestKnownIdRef.current, maxOrderId(newOrders));
        }

        syncDashboardCache(orders, summary);
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
        }
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    intervalId = setInterval(() => void poll(), OWNER_ORDER_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [businessId, queryClient, syncDashboardCache, showMultipleOrdersAlert, showNewOrderAlert, addNewOrderBanners]);
}
