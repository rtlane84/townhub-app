import type {
  WeatherDaily,
  WeatherForecast,
} from "@workspace/api-client-react";

/** WMO code buckets used for outlook messaging. */
function isThunderstorm(code: number) {
  return code >= 95;
}
function isSnow(code: number) {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}
function isHeavyRain(code: number) {
  return (code >= 63 && code <= 67) || (code >= 80 && code <= 82);
}
function isRain(code: number) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}
function isClearOrSunny(code: number) {
  return code === 0 || code === 1;
}

function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysKey(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

function periodWord(
  hour: number,
): "morning" | "afternoon" | "evening" | "tonight" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "tonight";
}

/**
 * One short, natural forecast sentence for the homepage greeting.
 * Returns null when data is missing or too thin to say anything useful.
 * Avoids restating the current conditions summary shown on the weather card.
 */
export function buildWeatherOutlookMessage(
  weather: WeatherForecast | undefined | null,
  options?: { placeLabel?: string | null; now?: Date },
): string | null {
  if (
    !weather?.enabled ||
    weather.unavailable ||
    !weather.current ||
    !weather.daily?.length
  ) {
    return null;
  }

  const now = options?.now ?? new Date();
  const place = options?.placeLabel?.trim() || null;
  const todayKey = localDateKey(now);
  const tomorrowKey = addDaysKey(now, 1);
  const hour = now.getHours();
  const period = periodWord(hour);

  const daily = [...weather.daily].sort((a, b) => a.date.localeCompare(b.date));
  const today = daily.find((d) => d.date === todayKey) ?? daily[0];
  const tomorrow = daily.find((d) => d.date === tomorrowKey);
  const week = daily.slice(0, 7);
  if (!today) return null;

  const current = weather.current;

  if (weather.alert?.summary) {
    return null;
  }

  // Priority: storms, snow, heavy rain, extreme heat/cold, big swings
  if (
    isThunderstorm(today.weatherCode) ||
    isThunderstorm(current.weatherCode)
  ) {
    return place
      ? `Storms may move through ${place} ${period === "morning" ? "later today" : period}.`
      : `Storms may move through ${period === "morning" ? "later today" : period}.`;
  }

  if (isSnow(today.weatherCode) || isSnow(current.weatherCode)) {
    return hour < 12
      ? "Snow is possible today — dress warm."
      : "Snow may continue into the evening.";
  }

  if (isHeavyRain(today.weatherCode) || isHeavyRain(current.weatherCode)) {
    if (hour < 12 && !isRain(current.weatherCode)) {
      return "Morning rain should clear later today.";
    }
    return period === "afternoon" || period === "evening"
      ? "Rain is possible later this afternoon."
      : "Expect wet weather through the day.";
  }

  if (isRain(today.weatherCode) && !isRain(current.weatherCode) && hour < 14) {
    return "Rain is possible later this afternoon.";
  }

  if (isRain(current.weatherCode) && hour < 12) {
    return "Morning rain should clear later today.";
  }

  if (today.highF >= 93) {
    return `Temperatures may reach ${Math.round(today.highF)}° today.`;
  }

  if (today.highF >= 90 && isClearOrSunny(today.weatherCode)) {
    return "Expect a warm and sunny afternoon.";
  }

  if (today.lowF <= 32 || current.temperatureF <= 32) {
    return "Freezing temperatures are in the forecast — bundle up.";
  }

  if (tomorrow && tomorrow.highF >= 93) {
    return `Temperatures may reach ${Math.round(tomorrow.highF)}° tomorrow.`;
  }

  if (tomorrow && today.highF - tomorrow.highF >= 12) {
    return "A cooler day is ahead tomorrow.";
  }

  if (tomorrow && tomorrow.highF - today.highF >= 12) {
    return "Expect a warmer day tomorrow.";
  }

  if (today.precipitationChance != null && today.precipitationChance >= 50) {
    return "Rain is likely today—keep an umbrella nearby.";
  }

  const weekHighs = week.map((d) => d.highF);
  const maxWeek = Math.max(...weekHighs);
  const minWeek = Math.min(...weekHighs);
  if (weekHighs.length >= 3 && maxWeek >= 90 && minWeek >= 80) {
    return "A hot week is ahead, with highs in the 90s.";
  }

  if (hour >= 17 && today.lowF <= 55) {
    return "A cooler evening is ahead.";
  }

  if (
    tomorrow &&
    !isRain(today.weatherCode) &&
    !isRain(tomorrow.weatherCode) &&
    !isThunderstorm(today.weatherCode) &&
    !isThunderstorm(tomorrow.weatherCode)
  ) {
    return "Dry weather is expected through tomorrow.";
  }

  if (isClearOrSunny(today.weatherCode) && today.highF >= 75 && hour < 17) {
    return "Expect a warm and sunny afternoon.";
  }

  if (tomorrow && isThunderstorm(tomorrow.weatherCode)) {
    return place
      ? `Storms may move through ${place} tomorrow.`
      : "Storms may move through tomorrow.";
  }

  if (tomorrow && isRain(tomorrow.weatherCode)) {
    return "Rain is possible tomorrow.";
  }

  // Mild fallback that isn't just repeating the current card summary
  if (tomorrow) {
    return outlookFromDaily(tomorrow, "tomorrow");
  }

  return null;
}

function outlookFromDaily(day: WeatherDaily, when: string): string | null {
  if (isThunderstorm(day.weatherCode))
    return `Storms may move through ${when}.`;
  if (isSnow(day.weatherCode)) return `Snow is possible ${when}.`;
  if (isRain(day.weatherCode)) return `Rain is possible ${when}.`;
  if (day.highF >= 90) return `Expect warm temperatures ${when}.`;
  if (day.highF <= 45) return `A cooler day is ahead ${when}.`;
  return null;
}

/** Events whose start date falls within the current local calendar week (Sun–Sat). */
export function filterEventsThisWeek<
  T extends { date: string; endDate?: string | null },
>(events: T[], now = new Date()): T[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const startKey = localDateKey(start);
  const endKey = localDateKey(end);

  return events.filter((event) => {
    const eventStart = event.date;
    const eventEnd = event.endDate?.trim() || event.date;
    return eventStart <= endKey && eventEnd >= startKey;
  });
}
