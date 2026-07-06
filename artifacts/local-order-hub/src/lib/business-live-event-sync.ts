import type { QueryClient } from "@tanstack/react-query";
import {
  getGetOrderQueryKey,
  getGetBusinessOrderSummaryQueryKey,
  getListBusinessOrdersQueryKey,
  getListBusinessAppointmentRequestsQueryKey,
} from "@workspace/api-client-react";
import { getKitchenBusinessOrdersQueryKey } from "@/lib/business-orders-api";
import type { BusinessLiveEvent } from "@/lib/business-live-event-types";
import { isAppointmentLiveEventType, isOrderLiveEventType } from "@/lib/business-live-event-types";
import { safeInvalidateQueries } from "@/lib/query-cancellation";

/** Marks related queries stale without awaiting — avoids CancelledError races with in-flight mutations. */
export function invalidateQueriesForBusinessLiveEvent(
  queryClient: QueryClient,
  event: BusinessLiveEvent,
): void {
  const { businessId, orderId, appointmentId } = event.data;

  if (isOrderLiveEventType(event.type)) {
    safeInvalidateQueries(queryClient, { queryKey: getKitchenBusinessOrdersQueryKey(businessId) });
    safeInvalidateQueries(queryClient, { queryKey: getGetBusinessOrderSummaryQueryKey(businessId) });
    safeInvalidateQueries(queryClient, { queryKey: getListBusinessOrdersQueryKey(businessId) });
    if (orderId != null) {
      safeInvalidateQueries(queryClient, { queryKey: getGetOrderQueryKey(orderId) });
    }
    return;
  }

  if (isAppointmentLiveEventType(event.type)) {
    safeInvalidateQueries(queryClient, {
      queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
    });
    if (appointmentId != null) {
      safeInvalidateQueries(queryClient, {
        queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
      });
    }
  }
}

export function isActionableBusinessLiveEvent(event: BusinessLiveEvent): boolean {
  return event.type !== "heartbeat";
}
