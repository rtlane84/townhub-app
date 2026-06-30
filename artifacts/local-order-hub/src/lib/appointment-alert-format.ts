import type { AppointmentRequest } from "@workspace/api-client-react";
import { formatTime12h } from "@workspace/api-zod";

export function appointmentAlertDescription(request: AppointmentRequest): string {
  const parts = [
    request.customerName,
    request.serviceName ?? "Appointment request",
    `${request.requestedDate} ${formatTime12h(request.requestedTime)}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function appointmentBannerHeadline(request: AppointmentRequest, extraCount = 0): string {
  if (extraCount > 0) {
    return `New appointment request · ${request.customerName} (+${extraCount} more)`;
  }
  return `New appointment request · ${request.customerName}`;
}

export function appointmentBannerDetails(request: AppointmentRequest): string {
  return [
    request.serviceName ?? "General request",
    `${request.requestedDate} at ${formatTime12h(request.requestedTime)}`,
    request.customerPhone ?? request.customerEmail ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
}
