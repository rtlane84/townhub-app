import { logger } from "./logger";
import {
  fetchWeatherKit,
  logWeatherKitError,
} from "./weatherkit";

export type WeatherCurrent = {
  temperatureF: number;
  /** Native WeatherKit condition, such as `Foggy` or `ScatteredThunderstorms`. */
  conditionCode: string;
  summary: string;
};

export type WeatherDaily = {
  date: string;
  highF: number;
  lowF: number;
  /** Native WeatherKit condition, such as `Foggy` or `ScatteredThunderstorms`. */
  conditionCode: string;
  summary: string;
  precipitationChance?: number;
};

export type WeatherForecastResponse = {
  enabled: true;
  locationLabel: string;
  current: WeatherCurrent;
  daily: WeatherDaily[];
  alert?: { summary: string; detailsUrl?: string; severity?: string };
  demo?: boolean;
};

export type WeatherErrorReason =
  | "missing_location"
  | "forecast_failed"
  | "malformed_response";

export type WeatherFetchFailure = {
  ok: false;
  reason: WeatherErrorReason;
  message: string;
  locationQuery: string;
};

export type WeatherFetchSuccess = {
  ok: true;
  forecast: WeatherForecastResponse;
};

export type WeatherFetchResult = WeatherFetchSuccess | WeatherFetchFailure;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const FORECAST_CACHE_TTL_MS = 10 * 60 * 1000;

const forecastCache = new Map<string, CacheEntry<WeatherForecastResponse>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function shouldUseWeatherDemoFallback(): boolean {
  if (process.env.WEATHER_DEMO_FALLBACK === "true") return true;
  if (process.env.WEATHER_DEMO_FALLBACK === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function buildDemoWeatherForecast(
  locationQuery: string,
  locationLabel?: string,
): WeatherForecastResponse {
  const today = new Date();
  const daily: WeatherDaily[] = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const conditionCode = index % 2 === 0 ? "PartlyCloudy" : "MostlyCloudy";
    return {
      date: date.toISOString().slice(0, 10),
      highF: 74 + index,
      lowF: 58 + index,
      conditionCode,
      summary: weatherKitConditionLabel(conditionCode),
      precipitationChance: 0,
    };
  });

  return {
    enabled: true,
    demo: true,
    locationLabel: locationLabel ?? locationQuery,
    current: {
      temperatureF: 68,
      conditionCode: "PartlyCloudy",
      summary: weatherKitConditionLabel("PartlyCloudy"),
    },
    daily,
  };
}

export async function fetchWeatherForecast(locationQuery: string): Promise<WeatherFetchResult> {
  const trimmed = locationQuery.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "missing_location",
      message: "Weather location is not configured.",
      locationQuery: trimmed,
    };
  }

  const cached = cacheGet(forecastCache, trimmed.toLowerCase());
  if (cached) {
    return { ok: true, forecast: cached };
  }

  const latitude = Number(process.env.WEATHERKIT_LATITUDE);
  const longitude = Number(process.env.WEATHERKIT_LONGITUDE);
  const timezone = process.env.WEATHERKIT_TIMEZONE?.trim() || "America/New_York";
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false,
      reason: "forecast_failed",
      message: "WeatherKit coordinates are not configured.",
      locationQuery: trimmed,
    };
  }

  let data: Awaited<ReturnType<typeof fetchWeatherKit>>;
  try {
    data = await fetchWeatherKit(latitude, longitude, timezone);
  } catch (err) {
    logWeatherKitError(err);
    return {
      ok: false,
      reason: "forecast_failed",
      message: "Weather provider request failed.",
      locationQuery: trimmed,
    };
  }

  const currentTempC = data.currentWeather?.temperature;
  const days = data.forecastDaily?.days;
  if (currentTempC == null || !Array.isArray(days) || days.length === 0) {
    logger.warn(
      {
        locationQuery: trimmed,
        hasCurrentTemp: currentTempC != null,
        hasDailyForecast: Array.isArray(days),
      },
      "Open-Meteo forecast response missing required fields",
    );
    return {
      ok: false,
      reason: "malformed_response",
      message: "Weather provider returned an incomplete forecast.",
      locationQuery: trimmed,
    };
  }

  const currentConditionCode = normalizeWeatherKitCondition(data.currentWeather?.conditionCode);
  const daily: WeatherDaily[] = days.slice(0, 5).map((day) => {
    const conditionCode = normalizeWeatherKitCondition(day.conditionCode);
    return {
      date: day.forecastStart?.slice(0, 10) ?? "",
      highF: Math.round(celsiusToFahrenheit(day.temperatureMax ?? 0)),
      lowF: Math.round(celsiusToFahrenheit(day.temperatureMin ?? 0)),
      conditionCode,
      summary: weatherKitConditionLabel(conditionCode),
      precipitationChance: Math.round((day.precipitationChance ?? 0) * 100),
    };
  });

  const result: WeatherForecastResponse = {
    enabled: true,
    locationLabel: trimmed,
    current: {
      temperatureF: Math.round(celsiusToFahrenheit(currentTempC)),
      conditionCode: currentConditionCode,
      summary: weatherKitConditionLabel(currentConditionCode),
    },
    daily,
  };

  const alert = data.weatherAlerts?.alerts?.[0];
  const alertSummary = alert?.description ?? alert?.summary;
  if (alert && alertSummary) {
    result.alert = {
      summary: alertSummary,
      detailsUrl: alert.detailsUrl,
      severity: alert.severity,
    };
  }

  cacheSet(forecastCache, trimmed.toLowerCase(), result, FORECAST_CACHE_TTL_MS);
  return { ok: true, forecast: result };
}

function celsiusToFahrenheit(value: number): number {
  return (value * 9) / 5 + 32;
}

function normalizeWeatherKitCondition(conditionCode?: string): string {
  const normalized = conditionCode?.trim();
  return normalized || "Unknown";
}

/** Turns the provider's stable condition code into a readable label without collapsing it. */
export function weatherKitConditionLabel(conditionCode: string): string {
  if (conditionCode === "Unknown") return "Unknown";
  return conditionCode.replace(/([a-z])([A-Z])/g, "$1 $2");
}
