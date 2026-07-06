import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, type Order } from "@workspace/api-client-react";
import { getKitchenBusinessOrdersQueryKey } from "@/lib/business-orders-api";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { orderAlertDescription } from "@/lib/order-alert-format";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sounds";
import { useBusinessLiveEventsContext } from "@/hooks/business-live-events-provider";
import {
  fetchOwnerOrderDashboardData,
  findNewOrdersSince,
  maxOrderId,
} from "@/lib/owner-order-live-refresh";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";

export const OWNER_ORDER_POLL_INTERVAL_MS = 12_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

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
  const { usePollingFallback, registerOrderRefresh } = useBusinessLiveEventsContext();

  const baselineSetRef = useRef(false);
  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const pollingRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);

  const processNewOrders = useCallback(
    (orders: Order[]) => {
      if (!businessId) return;

      if (!baselineSetRef.current) {
        latestKnownIdRef.current = maxOrderId(orders);
        baselineSetRef.current = true;
        return;
      }

      const newOrders = findNewOrdersSince(orders, latestKnownIdRef.current, alertedIdsRef.current);
      if (!newOrders.length) return;

      if (newOrders.length === 1) {
        const order = newOrders[0]!;
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
        playOrderAlertSound(businessId);
      } else {
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
        playOrderAlertSound(businessId);
      }

      addNewOrderBanners(newOrders);
      for (const order of newOrders) {
        alertedIdsRef.current.add(order.id);
      }
      latestKnownIdRef.current = Math.max(latestKnownIdRef.current, maxOrderId(newOrders));
    },
    [addNewOrderBanners, businessId, setLocation, toast],
  );

  const handleOrderLiveEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      if (event.type === "order.created") {
        const orders =
          queryClient.getQueryData<Order[]>(getKitchenBusinessOrdersQueryKey(businessId)) ?? [];
        processNewOrders(orders);
        return;
      }

      if (event.type === "order.updated") {
        const orderId = event.data.orderId;
        if (orderId != null) {
          markHighlights([], [orderId]);
        }
      }
    },
    [businessId, markHighlights, processNewOrders, queryClient],
  );

  useEffect(() => {
    if (!businessId || usePollingFallback) return;
    return registerOrderRefresh(handleOrderLiveEvent);
  }, [businessId, handleOrderLiveEvent, registerOrderRefresh, usePollingFallback]);

  useEffect(() => {
    if (!businessId || !usePollingFallback) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (!usePollingFallback) return;
      if (cancelled || pollingRef.current || document.hidden) return;
      if (Date.now() < rateLimitedUntilRef.current) return;
      pollingRef.current = true;

      try {
        const { orders, changes } = await fetchOwnerOrderDashboardData(queryClient, businessId);
        if (cancelled) return;

        if (changes.newOrderIds.length || changes.updatedOrderIds.length) {
          markHighlights(changes.newOrderIds, changes.updatedOrderIds);
        }

        processNewOrders(orders);
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
      if (!document.hidden && usePollingFallback) void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [businessId, markHighlights, processNewOrders, queryClient, usePollingFallback]);
}
