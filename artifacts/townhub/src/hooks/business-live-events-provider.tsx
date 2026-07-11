import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { isBusinessHubLiveEventsRoute } from "@/lib/business-hub-features";
import {
  buildBusinessLiveEventsUrl,
  isEventSourceSupported,
  sseReconnectDelayMs,
  SSE_MAX_RECONNECT_ATTEMPTS,
} from "@/lib/business-live-events";
import { shouldUseOwnerDashboardPolling } from "@/lib/business-hub-notification-manager";
import { connectBusinessLiveEventStream } from "@/lib/business-live-event-stream";
import {
  isActionableBusinessLiveEvent,
} from "@/lib/business-live-event-sync";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";
import { isAppointmentLiveEventType, isOrderLiveEventType } from "@/lib/business-live-event-types";
import { fetchOwnerOrderDashboardData } from "@/lib/owner-order-live-refresh";
import { fetchOwnerAppointmentDashboardData } from "@/lib/owner-appointment-live-refresh";
import { isQueryCancellationError } from "@/lib/query-cancellation";

export type BusinessLiveConnectionStatus =
  | "disconnected"
  | "connecting"
  | "live"
  | "reconnecting"
  | "fallback";

type BusinessLiveEventsContextValue = {
  status: BusinessLiveConnectionStatus;
  usePollingFallback: boolean;
  businessId: number | undefined;
  registerOrderRefresh: (handler: (event: BusinessLiveEvent) => Promise<void>) => () => void;
  registerAppointmentRefresh: (handler: (event: BusinessLiveEvent) => Promise<void>) => () => void;
};

const BusinessLiveEventsContext = createContext<BusinessLiveEventsContextValue | null>(null);

type ActiveConnection = {
  businessId: number;
  abort: AbortController;
};

let sharedActiveConnection: ActiveConnection | null = null;

function closeSharedConnection(): void {
  if (!sharedActiveConnection) return;
  sharedActiveConnection.abort.abort();
  sharedActiveConnection = null;
}

type ProviderProps = {
  businessId: number | undefined;
  enabled: boolean;
  children: ReactNode;
};

export function BusinessLiveEventsProvider({ businessId, enabled, children }: ProviderProps) {
  const [location] = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BusinessLiveConnectionStatus>("disconnected");

  const orderHandlersRef = useRef(new Set<(event: BusinessLiveEvent) => Promise<void>>());
  const appointmentHandlersRef = useRef(new Set<(event: BusinessLiveEvent) => Promise<void>>());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routeNeedsLiveEvents = isBusinessHubLiveEventsRoute(location);
  const shouldConnect = Boolean(
    enabled && isSignedIn && businessId && routeNeedsLiveEvents && isEventSourceSupported(),
  );

  const usePollingFallback = shouldUseOwnerDashboardPolling(
    routeNeedsLiveEvents,
    status,
    shouldConnect,
    isEventSourceSupported(),
  );

  const registerOrderRefresh = useCallback(
    (handler: (event: BusinessLiveEvent) => Promise<void>) => {
      orderHandlersRef.current.add(handler);
      return () => {
        orderHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const registerAppointmentRefresh = useCallback(
    (handler: (event: BusinessLiveEvent) => Promise<void>) => {
      appointmentHandlersRef.current.add(handler);
      return () => {
        appointmentHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const dispatchEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!isActionableBusinessLiveEvent(event) || !businessId) return;

      try {
        if (isOrderLiveEventType(event.type)) {
          await fetchOwnerOrderDashboardData(queryClient, businessId);
          for (const handler of orderHandlersRef.current) {
            await handler(event);
          }
          return;
        }

        if (isAppointmentLiveEventType(event.type)) {
          await fetchOwnerAppointmentDashboardData(queryClient, businessId);
          for (const handler of appointmentHandlersRef.current) {
            await handler(event);
          }
        }
      } catch (error) {
        if (!isQueryCancellationError(error)) throw error;
      }
    },
    [businessId, queryClient],
  );

  const connect = useCallback(async () => {
    if (!shouldConnect || !businessId) return;

    closeSharedConnection();

    const abort = new AbortController();
    sharedActiveConnection = { businessId, abort };

    setStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await connectBusinessLiveEventStream(
        buildBusinessLiveEventsUrl(businessId, token),
        headers,
        {
          onOpen: () => {
            reconnectAttemptRef.current = 0;
            setStatus("live");
            void fetchOwnerOrderDashboardData(queryClient, businessId);
            void fetchOwnerAppointmentDashboardData(queryClient, businessId);
          },
          onEvent: (event) => {
            void dispatchEvent(event);
          },
        },
        abort.signal,
      );

      if (abort.signal.aborted) return;

      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current >= SSE_MAX_RECONNECT_ATTEMPTS) {
        setStatus("fallback");
        return;
      }

      setStatus("reconnecting");
      reconnectTimerRef.current = setTimeout(() => {
        void connect();
      }, sseReconnectDelayMs(reconnectAttemptRef.current));
    } catch (error) {
      if (abort.signal.aborted) return;

      const httpStatus =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status)
          : undefined;

      if (httpStatus === 401 || httpStatus === 403) {
        setStatus("fallback");
        return;
      }

      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current >= SSE_MAX_RECONNECT_ATTEMPTS) {
        setStatus("fallback");
        return;
      }

      setStatus("reconnecting");
      const delay = sseReconnectDelayMs(reconnectAttemptRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        void connect();
      }, delay);
    } finally {
      if (sharedActiveConnection?.abort === abort) {
        sharedActiveConnection = null;
      }
    }
  }, [businessId, dispatchEvent, getToken, shouldConnect]);

  useEffect(() => {
    if (!shouldConnect) {
      closeSharedConnection();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      setStatus("disconnected");
      return;
    }

    void connect();

    return () => {
      closeSharedConnection();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect, shouldConnect, businessId]);

  const value = useMemo(
    () => ({
      status,
      usePollingFallback,
      businessId,
      registerOrderRefresh,
      registerAppointmentRefresh,
    }),
    [status, usePollingFallback, businessId, registerOrderRefresh, registerAppointmentRefresh],
  );

  return (
    <BusinessLiveEventsContext.Provider value={value}>{children}</BusinessLiveEventsContext.Provider>
  );
}

export function useBusinessLiveEventsContext(): BusinessLiveEventsContextValue {
  const ctx = useContext(BusinessLiveEventsContext);
  if (!ctx) {
    return {
      status: "disconnected",
      usePollingFallback: true,
      businessId: undefined,
      registerOrderRefresh: () => () => {},
      registerAppointmentRefresh: () => () => {},
    };
  }
  return ctx;
}

export function useBusinessLiveEvents(businessId?: number) {
  const ctx = useBusinessLiveEventsContext();
  return {
    status: ctx.businessId === businessId ? ctx.status : "disconnected",
    usePollingFallback: ctx.businessId === businessId ? ctx.usePollingFallback : true,
  };
}
