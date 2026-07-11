import { z } from "zod";
import { parseTimeToHHmm, formatTime12h, TIME_HHMM_PATTERN } from "./time";

export { formatTime12h } from "./time";

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const timePattern = TIME_HHMM_PATTERN;

function coerceTime(value: unknown): string | null {
  return parseTimeToHHmm(value);
}

function coerceDayEntry(raw: unknown): DayHoursInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const dayOfWeek = Number(row.dayOfWeek);
  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null;
  const isClosed = Boolean(row.isClosed);
  return {
    dayOfWeek,
    isClosed,
    openTime: isClosed ? null : coerceTime(row.openTime),
    closeTime: isClosed ? null : coerceTime(row.closeTime),
  };
}

export const businessDayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  openTime: z.string().regex(timePattern).nullable(),
  closeTime: z.string().regex(timePattern).nullable(),
});

export type DayHoursEntry = z.infer<typeof businessDayHoursSchema>;

export type DayHoursInput = {
  dayOfWeek: number;
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
};

export const structuredBusinessHoursSchema = z.array(businessDayHoursSchema).max(7);

export function defaultWeeklyHours(): DayHoursEntry[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek: dayOfWeek as DayOfWeek,
    isClosed: dayOfWeek === 0 || dayOfWeek === 6,
    openTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
    closeTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
  }));
}

export function normalizeWeeklyHours(input: DayHoursInput[]): DayHoursEntry[] {
  const byDay = new Map<number, DayHoursEntry>();
  for (const entry of input) {
    if (entry.dayOfWeek >= 0 && entry.dayOfWeek <= 6) {
      byDay.set(entry.dayOfWeek, {
        dayOfWeek: entry.dayOfWeek as DayOfWeek,
        isClosed: entry.isClosed,
        openTime: entry.isClosed ? null : (entry.openTime ?? "09:00"),
        closeTime: entry.isClosed ? null : (entry.closeTime ?? "17:00"),
      });
    }
  }
  return Array.from({ length: 7 }, (_, dayOfWeek) =>
    byDay.get(dayOfWeek) ?? {
      dayOfWeek: dayOfWeek as DayOfWeek,
      isClosed: true,
      openTime: null,
      closeTime: null,
    },
  );
}

export function parseStructuredHours(raw: unknown): DayHoursEntry[] | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length === 0) return null;

  const coerced = value.map(coerceDayEntry).filter((entry): entry is DayHoursInput => entry !== null);
  if (coerced.length === 0) return null;

  return normalizeWeeklyHours(coerced);
}

export function hasStructuredHours(hours: DayHoursInput[] | null | undefined): boolean {
  return !!hours?.length;
}

/** True when at least one day has open hours (for open-now badge). */
export function hasOpenHours(hours: DayHoursInput[] | null | undefined): boolean {
  if (!hours?.length) return false;
  return hours.some((day) => !day.isClosed && day.openTime && day.closeTime);
}

export function formatBusinessHoursLines(hours: DayHoursInput[]): string[] {
  return normalizeWeeklyHours(hours).map((day) => {
    const label = DAY_LABELS[day.dayOfWeek];
    if (day.isClosed || !day.openTime || !day.closeTime) {
      return `${label}: Closed`;
    }
    return `${label}: ${formatTime12h(day.openTime)} – ${formatTime12h(day.closeTime)}`;
  });
}

export function isOpenNow(
  hours: DayHoursInput[],
  now = new Date(),
  /**
   * Optional ordering buffer: treat the shop as closed this many minutes before
   * today's closeTime. Display/"open now" callers should omit this (default 0).
   * Overnight windows (close <= open) remain unsupported.
   */
  closingBufferMinutes = 0,
): boolean {
  const today = normalizeWeeklyHours(hours)[now.getDay()];
  if (today.isClosed || !today.openTime || !today.closeTime) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = today.openTime.split(":").map(Number);
  const [closeH, closeM] = today.closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes <= openMinutes) return false;
  const buffer = Number.isFinite(closingBufferMinutes)
    ? Math.max(0, Math.floor(closingBufferMinutes))
    : 0;
  const effectiveClose = closeMinutes - buffer;
  if (effectiveClose <= openMinutes) return false;
  return currentMinutes >= openMinutes && currentMinutes < effectiveClose;
}
