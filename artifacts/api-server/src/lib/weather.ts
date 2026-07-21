import { logger } from "./logger";
import { weatherCodeSummary } from "./weather-codes";
import {
  fetchWeatherKit,
  logWeatherKitError,
} from "./weatherkit";

export type WeatherCurrent = {
  temperatureF: number;
  weatherCode: number;
  summary: string;
};

export type WeatherDaily = {
  date: string;
  highF: number;
  lowF: number;
  weatherCode: number;
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
  | "geocoding_failed"
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
    const code = index % 2 === 0 ? 2 : 3;
    return {
      date: date.toISOString().slice(0, 10),
      highF: 74 + index,
      lowF: 58 + index,
      weatherCode: code,
      summary: weatherCodeSummary(code),
      precipitationChance: 0,
    };
  });

  return {
    enabled: true,
    demo: true,
    locationLabel: locationLabel ?? locationQuery,
    current: {
      temperatureF: 68,
      weatherCode: 2,
      summary: weatherCodeSummary(2),
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

  const currentCode = weatherKitConditionToWmo(data.currentWeather?.conditionCode);
  const daily: WeatherDaily[] = days.slice(0, 5).map((day) => {
    const code = weatherKitConditionToWmo(day.conditionCode);
    return {
      date: day.forecastStart?.slice(0, 10) ?? "",
      highF: Math.round(celsiusToFahrenheit(day.temperatureMax ?? 0)),
      lowF: Math.round(celsiusToFahrenheit(day.temperatureMin ?? 0)),
      weatherCode: code,
      summary: weatherCodeSummary(code),
      precipitationChance: Math.round((day.precipitationChance ?? 0) * 100),
    };
  });

  const result: WeatherForecastResponse = {
    enabled: true,
    locationLabel: trimmed,
    current: {
      temperatureF: Math.round(celsiusToFahrenheit(currentTempC)),
      weatherCode: currentCode,
      summary: weatherCodeSummary(currentCode),
    },
    daily,
  };

  const alert = data.weatherAlerts?.alerts?.[0];
  if (alert?.summary) {
    result.alert = {
      summary: alert.summary,
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

function weatherKitConditionToWmo(conditionCode?: string): number {
  switch (conditionCode) {
    case "Clear":
    case "MostlyClear":
      return 0;
    case "PartlyCloudy":
      return 2;
    case "MostlyCloudy":
      return 3;
    case "Cloudy":
    case "Foggy":
    case "Haze":
      return 45;
    case "Drizzle":
    case "FreezingDrizzle":
      return 51;
    case "Rain":
    case "Showers":
    case "HeavyRain":
      return 63;
    case "Snow":
    case "Flurries":
    case "HeavySnow":
      return 73;
    case "Sleet":
    case "FreezingRain":
    case "Hail":
      return 66;
    case "Thunderstorms":
      return 95;
    default:
      return 2;
  }
}
