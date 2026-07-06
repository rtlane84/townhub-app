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

export function appointmentToastTitle(request: AppointmentRequest): string {
  return `📅 New Appointment Request`;
}

export function appointmentToastBody(request: AppointmentRequest): string {
  return `${request.customerName}\n${request.serviceName ?? "Appointment"} • ${request.requestedDate} ${formatTime12h(request.requestedTime)}`;
}

export function appointmentToastTitleMultiple(count: number): string {
  return `${count} new appointment requests`;
}

export function appointmentBannerHeadline(request: AppointmentRequest, totalCount: number): string {
  if (totalCount > 1) {
    return `${totalCount} New Appointments Waiting`;
  }
  return `🔔 New Appointment · ${request.customerName}`;
}

export function appointmentBannerDetails(request: AppointmentRequest): string {
  return [
    request.customerName,
    request.serviceName ?? "General request",
    `${request.requestedDate} at ${formatTime12h(request.requestedTime)}`,
  ]
    .filter(Boolean)
    .join(" • ");
}
