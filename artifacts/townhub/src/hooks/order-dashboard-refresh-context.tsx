import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppointmentRequest, Order } from "@workspace/api-client-react";
import { ORDER_HIGHLIGHT_DURATION_MS } from "@/lib/order-dashboard-sync";
import {
  mergePendingAppointments,
  mergePendingOrders,
} from "@/lib/business-hub-notification-manager";

export type OrderHighlightKind = "new" | "updated";
export type AppointmentHighlightKind = OrderHighlightKind;

export type PendingOrderNotification = {
  orders: Order[];
};

export type PendingAppointmentNotification = {
  requests: AppointmentRequest[];
};

interface OrderDashboardRefreshContextValue {
  getHighlight: (orderId: number) => OrderHighlightKind | undefined;
  markHighlights: (newOrderIds: number[], updatedOrderIds: number[]) => void;
  pendingOrderNotification: PendingOrderNotification | null;
  queueOrderNotificationBanner: (orders: Order[]) => void;
  clearOrderNotificationBanner: () => void;
  getAppointmentHighlight: (requestId: number) => AppointmentHighlightKind | undefined;
  markAppointmentHighlights: (newRequestIds: number[], updatedRequestIds: number[]) => void;
  pendingAppointmentNotification: PendingAppointmentNotification | null;
  queueAppointmentNotificationBanner: (requests: AppointmentRequest[]) => void;
  clearAppointmentNotificationBanner: () => void;
}

const OrderDashboardRefreshContext = createContext<OrderDashboardRefreshContextValue | null>(null);

export function OrderDashboardRefreshProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlights] = useState<Map<number, OrderHighlightKind>>(() => new Map());
  const [pendingOrderNotification, setPendingOrderNotification] =
    useState<PendingOrderNotification | null>(null);
  const [appointmentHighlights, setAppointmentHighlights] = useState<Map<number, AppointmentHighlightKind>>(
    () => new Map(),
  );
  const [pendingAppointmentNotification, setPendingAppointmentNotification] =
    useState<PendingAppointmentNotification | null>(null);
  const timeoutIdsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const appointmentTimeoutIdsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearHighlight = useCallback((orderId: number) => {
    setHighlights((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Map(prev);
      next.delete(orderId);
      return next;
    });
    const timeoutId = timeoutIdsRef.current.get(orderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(orderId);
    }
  }, []);

  const scheduleClear = useCallback(
    (orderId: number) => {
      const existing = timeoutIdsRef.current.get(orderId);
      if (existing) clearTimeout(existing);

      const timeoutId = setTimeout(() => {
        clearHighlight(orderId);
      }, ORDER_HIGHLIGHT_DURATION_MS);
      timeoutIdsRef.current.set(orderId, timeoutId);
    },
    [clearHighlight],
  );

  const markHighlights = useCallback(
    (newOrderIds: number[], updatedOrderIds: number[]) => {
      if (!newOrderIds.length && !updatedOrderIds.length) return;

      setHighlights((prev) => {
        const next = new Map(prev);
        for (const id of newOrderIds) {
          next.set(id, "new");
        }
        for (const id of updatedOrderIds) {
          if (!next.has(id)) next.set(id, "updated");
        }
        return next;
      });

      for (const id of newOrderIds) scheduleClear(id);
      for (const id of updatedOrderIds) {
        if (!newOrderIds.includes(id)) scheduleClear(id);
      }
    },
    [scheduleClear],
  );

  const queueOrderNotificationBanner = useCallback((orders: Order[]) => {
    if (!orders.length) return;

    setPendingOrderNotification((prev) => {
      const merged = mergePendingOrders(prev?.orders ?? [], orders);
      return merged.length ? { orders: merged } : null;
    });
  }, []);

  const clearOrderNotificationBanner = useCallback(() => {
    setPendingOrderNotification(null);
  }, []);

  const clearAppointmentHighlight = useCallback((requestId: number) => {
    setAppointmentHighlights((prev) => {
      if (!prev.has(requestId)) return prev;
      const next = new Map(prev);
      next.delete(requestId);
      return next;
    });
    const timeoutId = appointmentTimeoutIdsRef.current.get(requestId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      appointmentTimeoutIdsRef.current.delete(requestId);
    }
  }, []);

  const scheduleAppointmentClear = useCallback(
    (requestId: number) => {
      const existing = appointmentTimeoutIdsRef.current.get(requestId);
      if (existing) clearTimeout(existing);

      const timeoutId = setTimeout(() => {
        clearAppointmentHighlight(requestId);
      }, ORDER_HIGHLIGHT_DURATION_MS);
      appointmentTimeoutIdsRef.current.set(requestId, timeoutId);
    },
    [clearAppointmentHighlight],
  );

  const markAppointmentHighlights = useCallback(
    (newRequestIds: number[], updatedRequestIds: number[]) => {
      if (!newRequestIds.length && !updatedRequestIds.length) return;

      setAppointmentHighlights((prev) => {
        const next = new Map(prev);
        for (const id of newRequestIds) {
          next.set(id, "new");
        }
        for (const id of updatedRequestIds) {
          if (!next.has(id)) next.set(id, "updated");
        }
        return next;
      });

      for (const id of newRequestIds) scheduleAppointmentClear(id);
      for (const id of updatedRequestIds) {
        if (!newRequestIds.includes(id)) scheduleAppointmentClear(id);
      }
    },
    [scheduleAppointmentClear],
  );

  const queueAppointmentNotificationBanner = useCallback((requests: AppointmentRequest[]) => {
    if (!requests.length) return;

    setPendingAppointmentNotification((prev) => {
      const merged = mergePendingAppointments(prev?.requests ?? [], requests);
      return merged.length ? { requests: merged } : null;
    });
  }, []);

  const clearAppointmentNotificationBanner = useCallback(() => {
    setPendingAppointmentNotification(null);
  }, []);

  const getHighlight = useCallback(
    (orderId: number) => highlights.get(orderId),
    [highlights],
  );

  const getAppointmentHighlight = useCallback(
    (requestId: number) => appointmentHighlights.get(requestId),
    [appointmentHighlights],
  );

  const value = useMemo(
    () => ({
      getHighlight,
      markHighlights,
      pendingOrderNotification,
      queueOrderNotificationBanner,
      clearOrderNotificationBanner,
      getAppointmentHighlight,
      markAppointmentHighlights,
      pendingAppointmentNotification,
      queueAppointmentNotificationBanner,
      clearAppointmentNotificationBanner,
    }),
    [
      getHighlight,
      markHighlights,
      pendingOrderNotification,
      queueOrderNotificationBanner,
      clearOrderNotificationBanner,
      getAppointmentHighlight,
      markAppointmentHighlights,
      pendingAppointmentNotification,
      queueAppointmentNotificationBanner,
      clearAppointmentNotificationBanner,
    ],
  );

  return (
    <OrderDashboardRefreshContext.Provider value={value}>
      {children}
    </OrderDashboardRefreshContext.Provider>
  );
}

export function useOrderHighlight(orderId: number): OrderHighlightKind | undefined {
  const ctx = useContext(OrderDashboardRefreshContext);
  return ctx?.getHighlight(orderId);
}

export function useOrderDashboardRefreshActions() {
  const ctx = useContext(OrderDashboardRefreshContext);
  if (!ctx) {
    throw new Error("useOrderDashboardRefreshActions must be used within OrderDashboardRefreshProvider");
  }
  return ctx;
}

export function usePendingOrderNotification() {
  const ctx = useContext(OrderDashboardRefreshContext);
  if (!ctx) {
    throw new Error("usePendingOrderNotification must be used within OrderDashboardRefreshProvider");
  }
  return {
    notification: ctx.pendingOrderNotification,
    clearNotification: ctx.clearOrderNotificationBanner,
  };
}

export function useAppointmentHighlight(requestId: number): AppointmentHighlightKind | undefined {
  const ctx = useContext(OrderDashboardRefreshContext);
  return ctx?.getAppointmentHighlight(requestId);
}

export function usePendingAppointmentNotification() {
  const ctx = useContext(OrderDashboardRefreshContext);
  if (!ctx) {
    throw new Error("usePendingAppointmentNotification must be used within OrderDashboardRefreshProvider");
  }
  return {
    notification: ctx.pendingAppointmentNotification,
    clearNotification: ctx.clearAppointmentNotificationBanner,
  };
}
