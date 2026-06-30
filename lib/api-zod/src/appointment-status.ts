import {
  AppointmentRequestStatus as AppointmentRequestStatusEnum,
  type AppointmentRequestStatus,
} from "./generated/types/appointmentRequestStatus";

const TRANSITIONS: Record<AppointmentRequestStatus, AppointmentRequestStatus[]> = {
  NEW: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

export function isAppointmentRequestStatus(value: string): value is AppointmentRequestStatus {
  return Object.values(AppointmentRequestStatusEnum).includes(value as AppointmentRequestStatus);
}

export function canTransitionAppointmentStatus(from: string, to: string): boolean {
  if (!isAppointmentRequestStatus(from) || !isAppointmentRequestStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export function appointmentStatusLabel(status: string): string {
  switch (status) {
    case "NEW":
      return "New request";
    case "CONFIRMED":
      return "Confirmed";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
    default:
      return status.replace(/_/g, " ");
  }
}

export function isTerminalAppointmentStatus(status: string): boolean {
  return status === "DECLINED" || status === "CANCELLED" || status === "COMPLETED";
}

export function appointmentSourceLabel(source: string): string {
  return source === "MANUAL" ? "Added manually" : "Customer request";
}
