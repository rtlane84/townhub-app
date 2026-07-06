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

export function invalidateQueriesForBusinessLiveEvent(
  queryClient: QueryClient,
  event: BusinessLiveEvent,
): void {
  const { businessId, orderId, appointmentId } = event.data;

  if (isOrderLiveEventType(event.type)) {
    queryClient.invalidateQueries({ queryKey: getKitchenBusinessOrdersQueryKey(businessId) });
    queryClient.invalidateQueries({ queryKey: getGetBusinessOrderSummaryQueryKey(businessId) });
    queryClient.invalidateQueries({ queryKey: getListBusinessOrdersQueryKey(businessId) });
    if (orderId != null) {
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
    }
    return;
  }

  if (isAppointmentLiveEventType(event.type)) {
    queryClient.invalidateQueries({
      queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
    });
    if (appointmentId != null) {
      queryClient.invalidateQueries({
        queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
      });
    }
  }
}

export function isActionableBusinessLiveEvent(event: BusinessLiveEvent): boolean {
  return event.type !== "heartbeat";
}
