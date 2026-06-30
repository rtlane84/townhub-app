import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  listBusinessAppointmentRequests,
  getListBusinessAppointmentRequestsQueryKey,
  type AppointmentRequest,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getOrderSoundsEnabled } from "@/lib/order-alert-preferences";
import { playOrderAlertChime } from "@/lib/order-alert-sound";
import { appointmentAlertDescription } from "@/lib/appointment-alert-format";
import {
  appointmentListsEqual,
  detectAppointmentListChanges,
  isAlertableNewAppointmentRequest,
} from "@/lib/appointment-dashboard-sync";
import { useOrderDashboardRefreshActions } from "@/hooks/order-dashboard-refresh-context";

const POLL_INTERVAL_MS = 5000;

function maxRequestId(requests: AppointmentRequest[]): number {
  if (!requests.length) return 0;
  return Math.max(...requests.map((r) => r.id));
}

export function useLiveAppointmentAlerts(
  businessId: number | undefined,
  enabled: boolean,
) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const {
    markAppointmentHighlights,
    addNewAppointmentBanners,
  } = useOrderDashboardRefreshActions();

  const baselineSetRef = useRef(false);
  const latestKnownIdRef = useRef(0);
  const alertedIdsRef = useRef(new Set<number>());
  const pollingRef = useRef(false);

  const syncAppointmentsCache = useCallback(
    (requests: AppointmentRequest[]) => {
      if (!businessId || !Array.isArray(requests)) return;

      const listKey = getListBusinessAppointmentRequestsQueryKey(businessId);
      const previous = queryClient.getQueryData<AppointmentRequest[]>(listKey);
      const changes = detectAppointmentListChanges(previous, requests);

      if (!appointmentListsEqual(previous, requests)) {
        queryClient.setQueryData(listKey, requests);
      }

      if (changes.newRequestIds.length || changes.updatedRequestIds.length) {
        markAppointmentHighlights(changes.newRequestIds, changes.updatedRequestIds);
      }
    },
    [businessId, markAppointmentHighlights, queryClient],
  );

  const showNewRequestAlert = useCallback(
    (request: AppointmentRequest) => {
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

      if (getOrderSoundsEnabled()) {
        playOrderAlertChime();
      }
    },
    [setLocation, toast],
  );

  const showMultipleRequestsAlert = useCallback(
    (requests: AppointmentRequest[]) => {
      const latest = requests[requests.length - 1]!;
      toast({
        title: `${requests.length} new appointment requests`,
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

      if (getOrderSoundsEnabled()) {
        playOrderAlertChime();
      }
    },
    [setLocation, toast],
  );

  useEffect(() => {
    if (!businessId || !enabled) {
      baselineSetRef.current = false;
      latestKnownIdRef.current = 0;
      alertedIdsRef.current = new Set();
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      if (cancelled || pollingRef.current || document.hidden) return;
      pollingRef.current = true;

      try {
        const requests = await listBusinessAppointmentRequests(businessId);
        if (cancelled) return;

        if (!baselineSetRef.current) {
          latestKnownIdRef.current = maxRequestId(requests);
          baselineSetRef.current = true;
          syncAppointmentsCache(requests);
          return;
        }

        const newRequests = requests
          .filter(
            (r) =>
              r.id > latestKnownIdRef.current &&
              !alertedIdsRef.current.has(r.id) &&
              isAlertableNewAppointmentRequest(r),
          )
          .sort((a, b) => a.id - b.id);

        if (newRequests.length === 1) {
          showNewRequestAlert(newRequests[0]!);
        } else if (newRequests.length > 1) {
          showMultipleRequestsAlert(newRequests);
        }

        if (newRequests.length > 0) {
          addNewAppointmentBanners(newRequests);
        }

        for (const request of newRequests) {
          alertedIdsRef.current.add(request.id);
        }

        if (newRequests.length > 0) {
          latestKnownIdRef.current = Math.max(latestKnownIdRef.current, maxRequestId(newRequests));
        }

        syncAppointmentsCache(requests);
      } catch {
        // ignore transient poll failures
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
    syncAppointmentsCache,
    showNewRequestAlert,
    showMultipleRequestsAlert,
    addNewAppointmentBanners,
  ]);
}
