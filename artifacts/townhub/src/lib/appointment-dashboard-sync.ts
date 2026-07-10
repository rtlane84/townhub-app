import type { AppointmentRequest } from "@workspace/api-client-react";

function appointmentRowSignature(request: AppointmentRequest): string {
  return [
    request.id,
    request.status,
    request.source,
    request.customerName,
    request.serviceName ?? "",
    request.requestedDate,
    request.requestedTime,
    request.statusNote ?? "",
  ].join("|");
}

export function appointmentListsEqual(
  a: AppointmentRequest[] | undefined,
  b: AppointmentRequest[],
): boolean {
  if (!a) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (appointmentRowSignature(a[i]!) !== appointmentRowSignature(b[i]!)) return false;
  }
  return true;
}

export function detectAppointmentListChanges(
  previous: AppointmentRequest[] | undefined,
  next: AppointmentRequest[],
): { newRequestIds: number[]; updatedRequestIds: number[]; hasChanges: boolean } {
  if (!previous) {
    return { newRequestIds: [], updatedRequestIds: [], hasChanges: next.length > 0 };
  }

  const previousById = new Map(previous.map((r) => [r.id, r]));
  const newRequestIds: number[] = [];
  const updatedRequestIds: number[] = [];

  for (const request of next) {
    const prev = previousById.get(request.id);
    if (!prev) {
      newRequestIds.push(request.id);
    } else if (appointmentRowSignature(prev) !== appointmentRowSignature(request)) {
      updatedRequestIds.push(request.id);
    }
  }

  const hasChanges =
    newRequestIds.length > 0 ||
    updatedRequestIds.length > 0 ||
    previous.length !== next.length;

  return { newRequestIds, updatedRequestIds, hasChanges };
}

export function isAlertableNewAppointmentRequest(request: AppointmentRequest): boolean {
  return request.status === "NEW" && request.source === "CUSTOMER";
}
