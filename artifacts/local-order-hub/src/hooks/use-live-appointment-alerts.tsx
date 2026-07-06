import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListBusinessAppointmentRequestsQueryKey,
  ApiError,
  type AppointmentRequest,
} from "@workspace/api-client-react";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { useBusinessLiveEventsContext } from "@/hooks/business-live-events-provider";
import { useBusinessHubNotifications } from "@/hooks/use-business-hub-notifications";
import {
  fetchOwnerAppointmentDashboardData,
  findNewAppointmentRequestsSince,
  maxAppointmentRequestId,
} from "@/lib/owner-appointment-live-refresh";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";

const POLL_INTERVAL_MS = 12_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

export function useLiveAppointmentAlerts(
  businessId: number | undefined,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const { markAppointmentHighlights } = useOrderDashboardRefreshActions();
  const { usePollingFallback, registerAppointmentRefresh } = useBusinessLiveEventsContext();
  const { notifyNewAppointments } = useBusinessHubNotifications(businessId);

  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const baselineReadyRef = useRef(false);
  const pollingRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);

  const recordNotifiedRequests = useCallback((requests: AppointmentRequest[]) => {
    for (const request of requests) {
      alertedIdsRef.current.add(request.id);
    }
    if (requests.length) {
      latestKnownIdRef.current = Math.max(
        latestKnownIdRef.current,
        maxAppointmentRequestId(requests),
      );
    }
  }, []);

  const notifyRequests = useCallback(
    (requests: AppointmentRequest[]) => {
      if (!requests.length) return;
      markAppointmentHighlights(
        requests.map((request) => request.id),
        [],
      );
      notifyNewAppointments(requests);
      recordNotifiedRequests(requests);
    },
    [markAppointmentHighlights, notifyNewAppointments, recordNotifiedRequests],
  );

  const resolveRequestForAlert = useCallback(
    async (requestId: number): Promise<AppointmentRequest | null> => {
      if (!businessId) return null;

      const listKey = getListBusinessAppointmentRequestsQueryKey(businessId);
      const cached = queryClient.getQueryData<AppointmentRequest[]>(listKey) ?? [];
      let request = cached.find((entry) => entry.id === requestId);
      if (request) return request;

      const refreshed = await fetchOwnerAppointmentDashboardData(queryClient, businessId);
      request = refreshed.requests.find((entry) => entry.id === requestId);
      return request ?? null;
    },
    [businessId, queryClient],
  );

  const processNewRequests = useCallback(
    (requests: AppointmentRequest[]) => {
      if (!businessId || !baselineReadyRef.current) return;

      const newRequests = findNewAppointmentRequestsSince(
        requests,
        latestKnownIdRef.current,
        alertedIdsRef.current,
      );
      notifyRequests(newRequests);
    },
    [businessId, notifyRequests],
  );

  const handleAppointmentCreatedEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      const appointmentId = event.data.appointmentId;
      if (appointmentId == null || alertedIdsRef.current.has(appointmentId)) {
        return;
      }

      const request = await resolveRequestForAlert(appointmentId);
      if (!request || alertedIdsRef.current.has(request.id)) {
        return;
      }

      notifyRequests([request]);
    },
    [businessId, notifyRequests, resolveRequestForAlert],
  );

  const handleAppointmentLiveEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      if (event.type === "appointment.created") {
        await handleAppointmentCreatedEvent(event);
        return;
      }

      if (event.type === "appointment.updated") {
        const appointmentId = event.data.appointmentId;
        if (appointmentId != null) {
          markAppointmentHighlights([], [appointmentId]);
        }
      }
    },
    [businessId, handleAppointmentCreatedEvent, markAppointmentHighlights],
  );

  useEffect(() => {
    if (!businessId || !enabled) {
      latestKnownIdRef.current = 0;
      alertedIdsRef.current = new Set();
      baselineReadyRef.current = false;
      return;
    }

    let cancelled = false;
    baselineReadyRef.current = false;

    const cached = queryClient.getQueryData<AppointmentRequest[]>(
      getListBusinessAppointmentRequestsQueryKey(businessId),
    );
    if (cached?.length) {
      latestKnownIdRef.current = maxAppointmentRequestId(cached);
    }

    void fetchOwnerAppointmentDashboardData(queryClient, businessId)
      .then(({ requests }) => {
        if (cancelled) return;
        latestKnownIdRef.current = maxAppointmentRequestId(requests);
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
  }, [businessId, enabled, queryClient]);

  useEffect(() => {
    if (!businessId || !enabled || usePollingFallback) return;
    return registerAppointmentRefresh(handleAppointmentLiveEvent);
  }, [businessId, enabled, handleAppointmentLiveEvent, registerAppointmentRefresh, usePollingFallback]);

  useEffect(() => {
    if (!businessId || !enabled) {
      return;
    }

    if (!usePollingFallback) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (cancelled || pollingRef.current || document.hidden) return;
      if (Date.now() < rateLimitedUntilRef.current) return;
      pollingRef.current = true;

      try {
        const { requests, changes } = await fetchOwnerAppointmentDashboardData(
          queryClient,
          businessId,
        );
        if (cancelled) return;

        if (!baselineReadyRef.current) {
          latestKnownIdRef.current = maxAppointmentRequestId(requests);
          baselineReadyRef.current = true;
        }

        if (changes.newRequestIds.length || changes.updatedRequestIds.length) {
          markAppointmentHighlights(changes.newRequestIds, changes.updatedRequestIds);
        }

        processNewRequests(requests);
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) {
          rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
        }
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    businessId,
    enabled,
    markAppointmentHighlights,
    processNewRequests,
    queryClient,
    usePollingFallback,
  ]);
}
