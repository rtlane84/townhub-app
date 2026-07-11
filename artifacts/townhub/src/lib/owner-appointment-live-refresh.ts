import type { QueryClient } from "@tanstack/react-query";
import {
  getListBusinessAppointmentRequestsQueryKey,
  listBusinessAppointmentRequests,
  type AppointmentRequest,
} from "@workspace/api-client-react";
import {
  appointmentListsEqual,
  detectAppointmentListChanges,
  isAlertableNewAppointmentRequest,
} from "@/lib/appointment-dashboard-sync";

export async function fetchOwnerAppointmentDashboardData(
  queryClient: QueryClient,
  businessId: number,
): Promise<{
  requests: AppointmentRequest[];
  changes: ReturnType<typeof detectAppointmentListChanges>;
}> {
  const requests = await queryClient.fetchQuery({
    queryKey: getListBusinessAppointmentRequestsQueryKey(businessId),
    queryFn: () => listBusinessAppointmentRequests(businessId),
    staleTime: 0,
  });

  const listKey = getListBusinessAppointmentRequestsQueryKey(businessId);
  const previous = queryClient.getQueryData<AppointmentRequest[]>(listKey);
  const changes = detectAppointmentListChanges(previous, requests);

  if (!appointmentListsEqual(previous, requests)) {
    queryClient.setQueryData(listKey, requests);
  }

  return { requests, changes };
}

export function maxAppointmentRequestId(requests: AppointmentRequest[]): number {
  if (!requests.length) return 0;
  return Math.max(...requests.map((r) => r.id));
}

export function findNewAppointmentRequestsSince(
  requests: AppointmentRequest[],
  latestKnownId: number,
  alertedIds: ReadonlySet<number>,
): AppointmentRequest[] {
  return requests
    .filter(
      (r) =>
        r.id > latestKnownId &&
        !alertedIds.has(r.id) &&
        isAlertableNewAppointmentRequest(r),
    )
    .sort((a, b) => a.id - b.id);
}
