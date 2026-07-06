import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListBusinessAppointmentRequestsQueryKey,
  ApiError,
  type AppointmentRequest,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { appointmentAlertDescription } from "@/lib/appointment-alert-format";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sounds";
import { useBusinessLiveEventsContext } from "@/hooks/business-live-events-provider";
import {
  fetchOwnerAppointmentDashboardData,
  findNewAppointmentRequestsSince,
  maxAppointmentRequestId,
} from "@/lib/owner-appointment-live-refresh";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";

const POLL_INTERVAL_MS = 12_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

function playAppointmentAlertSound(businessId: number): void {
  const prefs = getNotificationPreferences(businessId);
  if (!prefs.soundsEnabled) return;
  unlockNotificationSound();
  playNotificationSound(prefs.volume);
}

export function useLiveAppointmentAlerts(
  businessId: number | undefined,
  enabled: boolean,
) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { markAppointmentHighlights, addNewAppointmentBanners } = useOrderDashboardRefreshActions();
  const { usePollingFallback, registerAppointmentRefresh } = useBusinessLiveEventsContext();

  const baselineSetRef = useRef(false);
  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const pollingRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);

  const processNewRequests = useCallback(
    (requests: AppointmentRequest[]) => {
      if (!businessId) return;

      if (!baselineSetRef.current) {
        latestKnownIdRef.current = maxAppointmentRequestId(requests);
        baselineSetRef.current = true;
        return;
      }

      const newRequests = findNewAppointmentRequestsSince(
        requests,
        latestKnownIdRef.current,
        alertedIdsRef.current,
      );
      if (!newRequests.length) return;

      if (newRequests.length === 1) {
        const request = newRequests[0]!;
        toast({
          title: "New appointment request",
          description: appointmentAlertDescription(request),
          action: (
            <ToastAction
              altText="View appointments"
              onClick={() => setLocation("/dashboard/business/appointments")}
            >
              View
            </ToastAction>
          ),
        });
        playAppointmentAlertSound(businessId);
      } else {
        const latest = newRequests[newRequests.length - 1]!;
        toast({
          title: `${newRequests.length} new appointment requests`,
          description: `Latest: ${appointmentAlertDescription(latest)}`,
          action: (
            <ToastAction
              altText="View appointments"
              onClick={() => setLocation("/dashboard/business/appointments")}
            >
              View appointments
            </ToastAction>
          ),
        });
        playAppointmentAlertSound(businessId);
      }

      addNewAppointmentBanners(newRequests);
      for (const request of newRequests) {
        alertedIdsRef.current.add(request.id);
      }
      latestKnownIdRef.current = Math.max(
        latestKnownIdRef.current,
        maxAppointmentRequestId(newRequests),
      );
    },
    [addNewAppointmentBanners, businessId, setLocation, toast],
  );

  const handleAppointmentLiveEvent = useCallback(
    async (event: BusinessLiveEvent) => {
      if (!businessId) return;

      if (event.type === "appointment.created") {
        const requests =
          queryClient.getQueryData<AppointmentRequest[]>(
            getListBusinessAppointmentRequestsQueryKey(businessId),
          ) ?? [];
        processNewRequests(requests);
        return;
      }

      if (event.type === "appointment.updated") {
        const appointmentId = event.data.appointmentId;
        if (appointmentId != null) {
          markAppointmentHighlights([], [appointmentId]);
        }
      }
    },
    [businessId, markAppointmentHighlights, processNewRequests, queryClient],
  );

  useEffect(() => {
    if (!businessId || !enabled || usePollingFallback) return;
    return registerAppointmentRefresh(handleAppointmentLiveEvent);
  }, [businessId, enabled, handleAppointmentLiveEvent, registerAppointmentRefresh, usePollingFallback]);

  useEffect(() => {
    if (!businessId || !enabled) {
      baselineSetRef.current = false;
      latestKnownIdRef.current = 0;
      alertedIdsRef.current = new Set();
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
