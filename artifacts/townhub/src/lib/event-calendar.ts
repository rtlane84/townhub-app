import type { Event } from "@workspace/api-client-react";

/** Solid indicator colors for calendar day markers. */
export const EVENT_TYPE_DOT_CLASS: Record<string, string> = {
  COMMUNITY: "bg-sky-500",
  FOOD_TRUCK: "bg-orange-500",
  SEASONAL: "bg-emerald-500",
  SALE: "bg-rose-500",
  HOLIDAY: "bg-violet-500",
  MARKET: "bg-amber-500",
  OTHER: "bg-slate-400",
};

export type DayEventIndicators = {
  count: number;
  /** Unique event-type keys for the day, in appearance order (max 3 for dots). */
  types: string[];
};

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Build per-day indicator metadata for the month calendar. */
export function buildEventDayIndicators(
  events: Array<Pick<Event, "date" | "endDate" | "eventType">>,
): Map<string, DayEventIndicators> {
  const map = new Map<string, DayEventIndicators>();

  for (const event of events) {
    const endIso = event.endDate?.trim() || event.date;
    let cursor = event.date;
    while (cursor <= endIso) {
      const existing = map.get(cursor);
      if (!existing) {
        map.set(cursor, { count: 1, types: [event.eventType] });
      } else {
        existing.count += 1;
        if (!existing.types.includes(event.eventType) && existing.types.length < 3) {
          existing.types.push(event.eventType);
        }
      }
      const next = new Date(`${cursor}T12:00:00`);
      next.setDate(next.getDate() + 1);
      cursor = toIsoDateLocal(next);
    }
  }

  return map;
}

export function eventDotClass(eventType: string): string {
  return EVENT_TYPE_DOT_CLASS[eventType] ?? EVENT_TYPE_DOT_CLASS.OTHER;
}
