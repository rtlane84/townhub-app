import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, getOrder, type Order } from "@workspace/api-client-react";
import { getKitchenBusinessOrdersQueryKey } from "@/lib/business-orders-api";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { useBusinessLiveEventsContext } from "@/hooks/business-live-events-provider";
import { useBusinessHubNotifications } from "@/hooks/use-business-hub-notifications";
import {
  fetchOwnerOrderDashboardData,
  findNewOrdersSince,
  maxOrderId,
} from "@/lib/owner-order-live-refresh";
import {
  resolveOrderFromList,
} from "@/lib/owner-order-alert-state";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";

export const OWNER_ORDER_POLL_INTERVAL_MS = 12_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

export function useLiveOrderAlerts(businessId: number | undefined) {
  const queryClient = useQueryClient();
  const { markHighlights } = useOrderDashboardRefreshActions();
  const { usePollingFallback, registerOrderRefresh } = useBusinessLiveEventsContext();
  const { notifyNewOrders } = useBusinessHubNotifications(businessId);

  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const baselineReadyRef = useRef(false);
  const pollingRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);

  const recordNotifiedOrders = useCallback((orders: Order[]) => {
    for (const order of orders) {
      alertedIdsRef.current.add(order.id);
    }
    if (orders.length) {
      latestKnownIdRef.current = Math.max(latestKnownIdRef.current, maxOrderId(orders));
    }
  }, []);

  const notifyOrders = useCallback(
    (orders: Order[]) => {
      if (!orders.length) return;
      markHighlights(
        orders.map((order) => order.id),
        [],
      );
      notifyNewOrders(orders);
      recordNotifiedOrders(orders);
    },
    [markHighlights, notifyNewOrders, recordNotifiedOrders],
  );

  const resolveOrderForAlert = useCallback(
    async (orderId: number): Promise<Order | null> => {
      if (!businessId) return null;

      const listKey = getKitchenBusinessOrdersQueryKey(businessId);
      let order = resolveOrderFromList(queryClient.getQueryData<Order[]>(listKey) ?? [], orderId);
      if (order) return order;

      const refreshed = await fetchOwnerOrderDashboardData(queryClient, businessId);
      order = resolveOrderFromList(refreshed.orders, orderId);
      if (order) return order;

      try {
        return await getOrder(orderId);
      } catch {
        return null;
      }
    },
    [businessId, queryClient],
  );

  const processNewOrders = useCallback(
    (orders: Order[]) => {
      if (!businessId || !baselineReadyRef.current) return;

      const newOrders = findNewOrdersSince(orders, latestKnownIdRef.current, alertedIdsRef.current);
      notifyOrders(newOrders);
    },
    [businessId, notifyOrders],
  );

  const handleOrderCreatedEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      const orderId = event.data.orderId;
      if (orderId == null || alertedIdsRef.current.has(orderId)) {
        return;
      }

      const order = await resolveOrderForAlert(orderId);
      if (!order || alertedIdsRef.current.has(order.id)) {
        return;
      }

      notifyOrders([order]);
    },
    [businessId, notifyOrders, resolveOrderForAlert],
  );

  const handleOrderLiveEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      if (event.type === "order.created") {
        await handleOrderCreatedEvent(event);
        return;
      }

      if (event.type === "order.updated") {
        const orderId = event.data.orderId;
        if (orderId != null) {
          markHighlights([], [orderId]);
        }
      }
    },
    [businessId, handleOrderCreatedEvent, markHighlights],
  );

  useEffect(() => {
    if (!businessId) {
      latestKnownIdRef.current = 0;
      alertedIdsRef.current = new Set();
      baselineReadyRef.current = false;
      return;
    }

    let cancelled = false;
    baselineReadyRef.current = false;

    const cached = queryClient.getQueryData<Order[]>(getKitchenBusinessOrdersQueryKey(businessId));
    if (cached?.length) {
      latestKnownIdRef.current = maxOrderId(cached);
    }

    void fetchOwnerOrderDashboardData(queryClient, businessId)
      .then(({ orders }) => {
        if (cancelled) return;
        latestKnownIdRef.current = maxOrderId(orders);
        baselineReadyRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        baselineReadyRef.current = true;
      });

    return () => {
      cancelled = true;
      baselineReadyRef.current = false;
    };
  }, [businessId, queryClient]);

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

        if (!baselineReadyRef.current) {
          latestKnownIdRef.current = maxOrderId(orders);
          baselineReadyRef.current = true;
        }

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
