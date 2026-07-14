/** Default platform IANA timezone (Clay WV pilot-appropriate; not locality-named). */
export const DEFAULT_PLATFORM_TIMEZONE = "America/New_York";

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0=Sunday … 6=Saturday (same as `Date#getDay`). */
  weekday: number;
};

/**
 * Returns true when `timeZone` is a valid IANA zone recognized by the runtime.
 * Empty / non-string values are invalid.
 */
export function isValidIanaTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string") return false;
  const trimmed = timeZone.trim();
  if (!trimmed) return false;
  try {
    // Throws RangeError for unknown zones in modern Node / browsers.
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/** Normalize stored/API timezone; invalid or blank → platform default. */
export function resolvePlatformTimeZone(value: unknown): string {
  if (typeof value === "string" && isValidIanaTimeZone(value)) {
    return value.trim();
  }
  return DEFAULT_PLATFORM_TIMEZONE;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format an instant as civil YYYY-MM-DD in `timeZone` (no UTC day-shift).
 */
export function formatCivilDateInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_PLATFORM_TIMEZONE,
): string {
  const tz = resolvePlatformTimeZone(timeZone);
  const parts = getZonedParts(date, tz);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Calendar / clock parts for `date` as observed in `timeZone`.
 */
export function getZonedParts(
  date: Date,
  timeZone: string = DEFAULT_PLATFORM_TIMEZONE,
): ZonedDateTimeParts {
  const tz = resolvePlatformTimeZone(timeZone);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const map = new Map<string, string>();
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map.set(part.type, part.value);
  }

  const weekdayShort = map.get("weekday") ?? "Sun";
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  let hour = Number(map.get("hour") ?? "0");
  // Some engines still emit 24:00 for midnight under h23; normalize.
  if (hour === 24) hour = 0;

  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    hour,
    minute: Number(map.get("minute") ?? "0"),
    second: Number(map.get("second") ?? "0"),
    weekday: weekdayIndex[weekdayShort] ?? 0,
  };
}

/** Minutes since local midnight in the given timezone. */
export function getZonedMinutesOfDay(
  date: Date,
  timeZone: string = DEFAULT_PLATFORM_TIMEZONE,
): number {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

/**
 * Validate a YYYY-MM-DD civil date string (no Date parsing / UTC shift).
 */
export function isCivilDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = CIVIL_DATE_PATTERN.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Reject impossible calendar days (e.g. 2024-02-30).
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Interpret a date-only YYYY-MM-DD as a civil date (never shift via UTC midnight).
 * Returns null when malformed.
 */
export function parseCivilDateString(
  value: string,
): { year: number; month: number; day: number } | null {
  if (!isCivilDateString(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Add (or subtract) whole civil days to a YYYY-MM-DD string. */
export function addCivilDays(civilDate: string, days: number): string {
  const parsed = parseCivilDateString(civilDate);
  if (!parsed) return civilDate;
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

/**
 * Short weekday label (Mon, Tue, …) for a civil YYYY-MM-DD without TZ day-shift.
 */
export function formatCivilWeekdayShort(civilDate: string): string {
  const parsed = parseCivilDateString(civilDate);
  if (!parsed) return civilDate;
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(utc);
}

/**
 * Long weekday heading for a civil date (e.g. "Monday, Jul 13") without parseISO UTC shift.
 */
export function formatCivilDateHeading(civilDate: string): string {
  const parsed = parseCivilDateString(civilDate);
  if (!parsed) return civilDate;
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

/**
 * Compare civil YYYY-MM-DD strings. Negative if a < b, 0 if equal, positive if a > b.
 */
export function compareCivilDates(a: string, b: string): number {
  return a.localeCompare(b);
}
