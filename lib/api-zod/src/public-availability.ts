import {
  formatTime12h,
  hasOpenHours,
  normalizeWeeklyHours,
  parseStructuredHours,
  type DayHoursInput,
} from "./business-hours";
import {
  addCivilDays,
  compareCivilDates,
  formatCivilDateInTimeZone,
  formatCivilWeekdayShort,
  getZonedMinutesOfDay,
  getZonedParts,
  resolvePlatformTimeZone,
} from "./timezone";

export type PublicAvailabilityResult = {
  /** Primary status (e.g. "Open now", "Here now", "Closed"). */
  statusLabel: string;
  /** Timing line on its own row (e.g. "Closes 5:00 PM", "Next stop tomorrow 9:00 AM"). */
  scheduleLabel: string | null;
  /** True when open now or at an active mobile stop. */
  isOpen: boolean;
  /** Active mobile stop public name when applicable. */
  locationName: string | null;
};

export type PublicMobileStop = {
  locationDate: string;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean | null;
  locationName?: string | null;
};

export type PublicAvailabilityInput = {
  active?: boolean | null;
  /** Structured weekly hours (preferred). */
  structuredHours?: DayHoursInput[] | unknown | null;
  hoursEnabled?: boolean | null;
  /** Free-text hours fall back: presence alone is not enough for open-now math. */
  hours?: string | null;
  isMobileBusiness?: boolean | null;
  /** Legacy alias — treated like isMobileBusiness when true. */
  eventLocationEnabled?: boolean | null;
  mobileLocations?: PublicMobileStop[] | null;
};

function formatPublicTime(hhmm: string): string {
  // Keep minutes so morning/afternoon labels stay unambiguous; strip only :00.
  return formatTime12h(hhmm).replace(":00 ", " ");
}

function parseHmToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  // Accept HH:MM or HH:MM:SS from stored stop times.
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isUsableStop(stop: PublicMobileStop): boolean {
  return stop.isActive !== false && typeof stop.locationDate === "string" && !!stop.locationDate;
}

/**
 * True when a stop is still relevant for public listing (active now or not yet ended).
 * Past civil days and today’s stops past endTime are excluded.
 */
export function isMobileStopCurrentOrUpcoming(
  stop: PublicMobileStop,
  now: Date,
  timeZone: string,
): boolean {
  if (!isUsableStop(stop)) return false;
  const tz = resolvePlatformTimeZone(timeZone);
  const today = formatCivilDateInTimeZone(now, tz);
  const cmp = compareCivilDates(stop.locationDate, today);
  if (cmp > 0) return true;
  if (cmp < 0) return false;

  const currentMinutes = getZonedMinutesOfDay(now, tz);
  const start = parseHmToMinutes(stop.startTime);
  const end = parseHmToMinutes(stop.endTime);
  // Overnight unsupported — treat as not listable.
  if (start != null && end != null && end <= start) return false;
  // Whole-day / open-ended: stays current for the rest of the civil day.
  if (end == null) return true;
  return currentMinutes < end;
}

export function filterCurrentOrUpcomingMobileStops<T extends PublicMobileStop>(
  stops: readonly T[],
  now: Date,
  timeZone: string,
): T[] {
  return stops.filter((stop) => isMobileStopCurrentOrUpcoming(stop, now, timeZone));
}

/**
 * True when a stop has not started yet (later today before startTime, or a future civil date).
 * Excludes the stop currently containing now — those belong in status, not "next/upcoming".
 */
export function isMobileStopFuture(
  stop: PublicMobileStop,
  now: Date,
  timeZone: string,
): boolean {
  if (!isUsableStop(stop)) return false;
  const tz = resolvePlatformTimeZone(timeZone);
  const today = formatCivilDateInTimeZone(now, tz);
  const cmp = compareCivilDates(stop.locationDate, today);
  if (cmp > 0) return true;
  if (cmp < 0) return false;

  const currentMinutes = getZonedMinutesOfDay(now, tz);
  const start = parseHmToMinutes(stop.startTime);
  const end = parseHmToMinutes(stop.endTime);
  if (start != null && end != null && end <= start) return false;
  // Timed stop later today — before startTime only.
  if (start != null) return currentMinutes < start;
  // Whole-day / end-only today: active status covers "here now"; not a future listing.
  return false;
}

function compareMobileStopsBySchedule(a: PublicMobileStop, b: PublicMobileStop): number {
  const byDate = compareCivilDates(a.locationDate, b.locationDate);
  if (byDate !== 0) return byDate;
  return (a.startTime ?? "").localeCompare(b.startTime ?? "");
}

/** Future stops only, sorted by date then start time. */
export function filterFutureMobileStops<T extends PublicMobileStop>(
  stops: readonly T[],
  now: Date,
  timeZone: string,
): T[] {
  return stops
    .filter((stop) => isMobileStopFuture(stop, now, timeZone))
    .sort(compareMobileStopsBySchedule);
}

function stopContainsNow(
  stop: PublicMobileStop,
  today: string,
  currentMinutes: number,
): boolean {
  if (!isUsableStop(stop) || stop.locationDate !== today) return false;
  const start = parseHmToMinutes(stop.startTime);
  const end = parseHmToMinutes(stop.endTime);
  // Overnight unsupported — fail safe (not "here now")
  if (start != null && end != null && end <= start) return false;
  if (start == null && end == null) return true;
  if (start != null && end == null) return currentMinutes >= start;
  if (start == null && end != null) return currentMinutes < end;
  return currentMinutes >= (start as number) && currentMinutes < (end as number);
}

function resolveStructured(
  business: PublicAvailabilityInput,
): DayHoursInput[] | null {
  if (business.hoursEnabled === false) return null;
  const parsed = Array.isArray(business.structuredHours)
    ? normalizeWeeklyHours(business.structuredHours as DayHoursInput[])
    : parseStructuredHours(business.structuredHours);
  if (!parsed || !hasOpenHours(parsed)) return null;
  return parsed;
}

function isMobileMode(business: PublicAvailabilityInput): boolean {
  return (
    business.isMobileBusiness === true || business.eventLocationEnabled === true
  );
}

function fixedHoursAvailability(
  hours: DayHoursInput[],
  now: Date,
  timeZone: string,
): PublicAvailabilityResult {
  const parts = getZonedParts(now, timeZone);
  const currentMinutes = parts.hour * 60 + parts.minute;
  const today = normalizeWeeklyHours(hours)[parts.weekday];

  const openMinutes = today?.openTime ? parseHmToMinutes(today.openTime) : null;
  const closeMinutes = today?.closeTime ? parseHmToMinutes(today.closeTime) : null;
  const openToday =
    !!today &&
    !today.isClosed &&
    openMinutes != null &&
    closeMinutes != null &&
    closeMinutes > openMinutes;

  if (
    openToday &&
    openMinutes != null &&
    closeMinutes != null &&
    currentMinutes >= openMinutes &&
    currentMinutes < closeMinutes
  ) {
    return {
      statusLabel: "Open now",
      scheduleLabel: today.closeTime
        ? `Closes ${formatPublicTime(today.closeTime)}`
        : null,
      isOpen: true,
      locationName: null,
    };
  }

  // Later today
  if (openToday && openMinutes != null && currentMinutes < openMinutes && today.openTime) {
    return {
      statusLabel: "Closed",
      scheduleLabel: `Opens ${formatPublicTime(today.openTime)}`,
      isOpen: false,
      locationName: null,
    };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const dayIndex = (parts.weekday + offset) % 7;
    const day = normalizeWeeklyHours(hours)[dayIndex];
    if (day?.isClosed || !day?.openTime) continue;
    const open = parseHmToMinutes(day.openTime);
    const close = parseHmToMinutes(day.closeTime);
    if (open == null || close == null || close <= open) continue;

    if (offset === 1) {
      return {
        statusLabel: "Closed",
        scheduleLabel: `Opens tomorrow ${formatPublicTime(day.openTime)}`,
        isOpen: false,
        locationName: null,
      };
    }

    const civilToday = formatCivilDateInTimeZone(now, timeZone);
    const targetCivil = addCivilDays(civilToday, offset);
    const weekday = formatCivilWeekdayShort(targetCivil);
    return {
      statusLabel: "Closed",
      scheduleLabel: `Opens ${weekday} ${formatPublicTime(day.openTime)}`,
      isOpen: false,
      locationName: null,
    };
  }

  return {
    statusLabel: "Closed",
    scheduleLabel: null,
    isOpen: false,
    locationName: null,
  };
}

function mobileAvailability(
  stops: PublicMobileStop[],
  now: Date,
  timeZone: string,
): PublicAvailabilityResult {
  const usable = stops.filter(isUsableStop);
  const today = formatCivilDateInTimeZone(now, timeZone);
  const currentMinutes = getZonedMinutesOfDay(now, timeZone);

  const active = usable.find((stop) => stopContainsNow(stop, today, currentMinutes));
  if (active) {
    const name = active.locationName?.trim() || null;
    return {
      statusLabel: name || "Here now",
      scheduleLabel: active.endTime
        ? `Here until ${formatPublicTime(active.endTime)}`
        : name
          ? "Here now"
          : null,
      isOpen: true,
      locationName: name,
    };
  }

  const upcoming = filterFutureMobileStops(usable, now, timeZone);

  const next = upcoming[0];
  if (next) {
    const startLabel = next.startTime ? formatPublicTime(next.startTime) : null;
    if (next.locationDate === today) {
      if (startLabel) {
        return {
          statusLabel: "Not currently at a scheduled stop",
          scheduleLabel: `Next stop tonight ${startLabel}`,
          isOpen: false,
          locationName: null,
        };
      }
      return {
        statusLabel: "Check today's location schedule",
        scheduleLabel: null,
        isOpen: false,
        locationName: null,
      };
    }

    const tomorrow = addCivilDays(today, 1);
    if (next.locationDate === tomorrow) {
      return {
        statusLabel: "Not currently at a scheduled stop",
        scheduleLabel: startLabel
          ? `Next stop tomorrow ${startLabel}`
          : "See upcoming stops",
        isOpen: false,
        locationName: null,
      };
    }

    const daysAhead = (() => {
      let n = 0;
      let cursor = today;
      while (n < 60 && cursor < next.locationDate) {
        cursor = addCivilDays(cursor, 1);
        n += 1;
      }
      return n;
    })();

    if (daysAhead <= 7 && startLabel) {
      return {
        statusLabel: "Not currently at a scheduled stop",
        scheduleLabel: `Next stop ${formatCivilWeekdayShort(next.locationDate)} ${startLabel}`,
        isOpen: false,
        locationName: null,
      };
    }

    return {
      statusLabel: "See upcoming stops",
      scheduleLabel: null,
      isOpen: false,
      locationName: null,
    };
  }

  const hasTodayStops = usable.some((s) => s.locationDate === today);
  if (hasTodayStops) {
    const todayStops = usable.filter((s) => s.locationDate === today);
    const anyTimed = todayStops.some(
      (s) => parseHmToMinutes(s.startTime) != null || parseHmToMinutes(s.endTime) != null,
    );
    if (!anyTimed) {
      return {
        statusLabel: "Check today's location schedule",
        scheduleLabel: null,
        isOpen: false,
        locationName: null,
      };
    }
    return {
      statusLabel: "Not currently at a scheduled stop",
      scheduleLabel: null,
      isOpen: false,
      locationName: null,
    };
  }

  if (usable.length > 0) {
    // Past-only stops remain in the DB but are not upcoming — do not prompt
    // customers to "see upcoming stops" when none exist.
    return {
      statusLabel: "Not currently at a scheduled stop",
      scheduleLabel: null,
      isOpen: false,
      locationName: null,
    };
  }

  return {
    statusLabel: "Not currently at a scheduled stop",
    scheduleLabel: null,
    isOpen: false,
    locationName: null,
  };
}

/**
 * Unified public availability for directory / storefront (not ordering gates).
 * Requires an explicit `now` and IANA `timeZone` — never infers host TZ as product truth.
 */
export function evaluatePublicAvailability(
  business: PublicAvailabilityInput,
  now: Date,
  timeZone: string,
): PublicAvailabilityResult {
  const tz = resolvePlatformTimeZone(timeZone);

  if (business.active === false) {
    return {
      statusLabel: "Closed",
      scheduleLabel: null,
      isOpen: false,
      locationName: null,
    };
  }

  if (isMobileMode(business)) {
    return mobileAvailability(business.mobileLocations ?? [], now, tz);
  }

  const hours = resolveStructured(business);
  if (!hours) {
    return {
      statusLabel: "Hours not provided",
      scheduleLabel: null,
      isOpen: false,
      locationName: null,
    };
  }

  return fixedHoursAvailability(hours, now, tz);
}
