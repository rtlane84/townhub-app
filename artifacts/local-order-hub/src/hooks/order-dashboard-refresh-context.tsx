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

export type OrderHighlightKind = "new" | "updated";
export type AppointmentHighlightKind = OrderHighlightKind;

export interface PendingOrderBanner {
  order: Order;
}

export interface PendingAppointmentBanner {
  request: AppointmentRequest;
}

interface OrderDashboardRefreshContextValue {
  getHighlight: (orderId: number) => OrderHighlightKind | undefined;
  markHighlights: (newOrderIds: number[], updatedOrderIds: number[]) => void;
  pendingBanners: PendingOrderBanner[];
  addNewOrderBanners: (orders: Order[]) => void;
  dismissBanner: (orderId: number) => void;
  getAppointmentHighlight: (requestId: number) => AppointmentHighlightKind | undefined;
  markAppointmentHighlights: (newRequestIds: number[], updatedRequestIds: number[]) => void;
  pendingAppointmentBanners: PendingAppointmentBanner[];
  addNewAppointmentBanners: (requests: AppointmentRequest[]) => void;
  dismissAppointmentBanner: (requestId: number) => void;
}

const OrderDashboardRefreshContext = createContext<OrderDashboardRefreshContextValue | null>(null);

export function OrderDashboardRefreshProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlights] = useState<Map<number, OrderHighlightKind>>(() => new Map());
  const [pendingBanners, setPendingBanners] = useState<PendingOrderBanner[]>([]);
  const [appointmentHighlights, setAppointmentHighlights] = useState<Map<number, AppointmentHighlightKind>>(
    () => new Map(),
  );
  const [pendingAppointmentBanners, setPendingAppointmentBanners] = useState<PendingAppointmentBanner[]>([]);
  const timeoutIdsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const bannerOrderIdsRef = useRef<Set<number>>(new Set());
  const appointmentTimeoutIdsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const bannerAppointmentIdsRef = useRef<Set<number>>(new Set());

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

  const addNewOrderBanners = useCallback((orders: Order[]) => {
    if (!orders.length) return;

    setPendingBanners((prev) => {
      const next = [...prev];
      for (const order of orders) {
        if (bannerOrderIdsRef.current.has(order.id)) continue;
        bannerOrderIdsRef.current.add(order.id);
        next.push({ order });
      }
      return next.sort((a, b) => b.order.id - a.order.id);
    });
  }, []);

  const dismissBanner = useCallback((orderId: number) => {
    setPendingBanners((prev) => prev.filter((b) => b.order.id !== orderId));
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

  const addNewAppointmentBanners = useCallback((requests: AppointmentRequest[]) => {
    if (!requests.length) return;

    setPendingAppointmentBanners((prev) => {
      const next = [...prev];
      for (const request of requests) {
        if (bannerAppointmentIdsRef.current.has(request.id)) continue;
        bannerAppointmentIdsRef.current.add(request.id);
        next.push({ request });
      }
      return next.sort((a, b) => b.request.id - a.request.id);
    });
  }, []);

  const dismissAppointmentBanner = useCallback((requestId: number) => {
    setPendingAppointmentBanners((prev) => prev.filter((b) => b.request.id !== requestId));
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
      pendingBanners,
      addNewOrderBanners,
      dismissBanner,
      getAppointmentHighlight,
      markAppointmentHighlights,
      pendingAppointmentBanners,
      addNewAppointmentBanners,
      dismissAppointmentBanner,
    }),
    [
      getHighlight,
      markHighlights,
      pendingBanners,
      addNewOrderBanners,
      dismissBanner,
      getAppointmentHighlight,
      markAppointmentHighlights,
      pendingAppointmentBanners,
      addNewAppointmentBanners,
      dismissAppointmentBanner,
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

export function usePendingOrderBanners() {
  const ctx = useContext(OrderDashboardRefreshContext);
  if (!ctx) {
    throw new Error("usePendingOrderBanners must be used within OrderDashboardRefreshProvider");
  }
  return {
    pendingBanners: ctx.pendingBanners,
    dismissBanner: ctx.dismissBanner,
  };
}

export function useAppointmentHighlight(requestId: number): AppointmentHighlightKind | undefined {
  const ctx = useContext(OrderDashboardRefreshContext);
  return ctx?.getAppointmentHighlight(requestId);
}

export function usePendingAppointmentBanners() {
  const ctx = useContext(OrderDashboardRefreshContext);
  if (!ctx) {
    throw new Error("usePendingAppointmentBanners must be used within OrderDashboardRefreshProvider");
  }
  return {
    pendingBanners: ctx.pendingAppointmentBanners,
    dismissBanner: ctx.dismissAppointmentBanner,
  };
}
