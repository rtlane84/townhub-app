/** 24-hour time in HH:mm (00:00–23:59). */
export const TIME_HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const TIME_INCREMENT_MINUTES = 15;
export const TIME_INPUT_STEP_SECONDS = TIME_INCREMENT_MINUTES * 60;

export function isValidTimeHHmm(value: string): boolean {
  return TIME_HHMM_PATTERN.test(value);
}

export function snapTimeToIncrement(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMinutes = h * 60 + m;
  const snapped = Math.round(totalMinutes / TIME_INCREMENT_MINUTES) * TIME_INCREMENT_MINUTES;
  const clamped = Math.min(snapped, 23 * 60 + 45);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toHHmm(hours: number, minutes: number): string | null {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return snapTimeToIncrement(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
}

function parse12hMatch(match: RegExpMatchArray): string | null {
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].replace(/\./g, "").toLowerCase();
  if (minutes > 59) return null;
  if (meridiem.startsWith("p") && hours !== 12) hours += 12;
  if (meridiem.startsWith("a") && hours === 12) hours = 0;
  if (hours > 23) return null;
  return toHHmm(hours, minutes);
}

/**
 * Parses common time strings to HH:mm. Returns null for empty/invalid input.
 * Supports HH:mm, HH:mm:ss (Safari/iOS time inputs), 12-hour with AM/PM,
 * and legacy free-text containing a time.
 */
export function parseTimeToHHmm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Strip seconds / fractional seconds from native time inputs before matching.
  const withoutSeconds = trimmed.replace(/^(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?$/, "$1");

  if (TIME_HHMM_PATTERN.test(withoutSeconds)) {
    return snapTimeToIncrement(withoutSeconds);
  }

  const h12Strict = withoutSeconds.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\.?$/i);
  if (h12Strict) {
    return parse12hMatch(h12Strict);
  }

  const embedded = withoutSeconds.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (embedded) {
    return parse12hMatch(embedded);
  }

  const h24 = withoutSeconds.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    return toHHmm(Number(h24[1]), Number(h24[2]));
  }

  return null;
}

/** Normalizes optional time fields to HH:mm or empty string. */
export function normalizeOptionalTime(value: unknown): string {
  return parseTimeToHHmm(value) ?? "";
}

/** Normalizes required time fields to HH:mm or null when invalid. */
export function normalizeRequiredTime(value: unknown): string | null {
  return parseTimeToHHmm(value);
}

export function compareTimes(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

export function isEndTimeAfterStart(start: string, end: string): boolean {
  if (!isValidTimeHHmm(start) || !isValidTimeHHmm(end)) return true;
  return compareTimes(end, start) > 0;
}

export function formatTime12h(time: string): string {
  const parsed = parseTimeToHHmm(time);
  if (!parsed) return time.trim();
  const [h, m] = parsed.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatTimeRange12h(
  startTime?: string | null,
  endTime?: string | null,
): string | null {
  const start = startTime?.trim();
  const end = endTime?.trim();
  const startFormatted = start ? formatTime12h(start) : null;
  const endFormatted = end ? formatTime12h(end) : null;
  if (startFormatted && endFormatted) return `${startFormatted} – ${endFormatted}`;
  if (startFormatted) return startFormatted;
  if (endFormatted) return `Until ${endFormatted}`;
  return null;
}
