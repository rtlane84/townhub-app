import { format, parseISO } from "date-fns";
import type { Event } from "@workspace/api-client-react";

type EventDates = Pick<Event, "date" | "endDate" | "startTime" | "endTime">;

function formatTimeRange(startTime?: string | null, endTime?: string | null): string | null {
  const start = startTime?.trim();
  const end = endTime?.trim();
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return `Until ${end}`;
  return null;
}

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
  const timePart = formatTimeRange(event.startTime, event.endTime);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}
