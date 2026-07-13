import { format, parseISO } from "date-fns";
import type { Event } from "@workspace/api-client-react";
import { formatTimeRange12h } from "@workspace/api-zod";

type EventDates = Pick<Event, "date" | "endDate" | "startTime" | "endTime">;

/** Formats YYYY-MM-DD (and optional end date) for display, e.g. Jun 24–26, 2026 */
export function formatEventDateRange(event: EventDates): string {
  const start = parseISO(event.date);
  const endRaw = event.endDate?.trim();
  const end = endRaw ? parseISO(endRaw) : null;

  if (!end || endRaw === event.date) {
    return format(start, "MMM d, yyyy");
  }

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`;
    }
    return `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")}–${format(end, "MMM d, yyyy")}`;
}

/** Date line with optional time suffix, e.g. Jun 24–26, 2026 · 9:00 AM–3:00 PM */
export function formatEventSchedule(event: EventDates): string {
  const datePart = formatEventDateRange(event);
  const timePart = formatTimeRange12h(event.startTime, event.endTime);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

/** Local calendar day as YYYY-MM-DD */
export function toLocalIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** True when the calendar day falls within the event's start/end range (inclusive). */
export function eventOccursOnDate(event: EventDates, dayIso: string): boolean {
  const endIso = event.endDate?.trim() || event.date;
  return dayIso >= event.date && dayIso <= endIso;
}
