import { logger } from "./logger";
import { weatherCodeSummary } from "./weather-codes";
import {
  formatGeocodeLabel,
  parseLocationQuery,
  pickBestGeocodeHit,
  type GeocodeHit,
} from "./weather-geocode";

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
};

export type WeatherForecastResponse = {
  enabled: true;
  locationLabel: string;
  current: WeatherCurrent;
  daily: WeatherDaily[];
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

type GeocodeResult = {
  latitude: number;
  longitude: number;
  label: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const FORECAST_CACHE_TTL_MS = 10 * 60 * 1000;
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const forecastCache = new Map<string, CacheEntry<WeatherForecastResponse>>();
const geocodeCache = new Map<string, CacheEntry<GeocodeResult>>();

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

function geocodeSearchQueries(locationQuery: string): string[] {
  const parsed = parseLocationQuery(locationQuery);
  const queries = [parsed.city, locationQuery.trim()].filter(Boolean);
  return [...new Set(queries)];
}

async function searchGeocodeHits(name: string): Promise<GeocodeHit[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    logger.warn({ err, name }, "Open-Meteo geocoding request failed");
    return [];
  }

  if (!response.ok) {
    logger.warn(
      { name, status: response.status, statusText: response.statusText },
      "Open-Meteo geocoding returned non-OK status",
    );
    return [];
  }

  const data = (await response.json()) as { results?: GeocodeHit[] };
  return data.results ?? [];
}

async function geocodeLocation(
  locationQuery: string,
): Promise<{ ok: true; result: GeocodeResult } | { ok: false; message: string }> {
  const normalized = locationQuery.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Location query is blank." };
  }

  const cached = cacheGet(geocodeCache, normalized);
  if (cached) return { ok: true, result: cached };

  const parsed = parseLocationQuery(locationQuery);
  if (!parsed.city) {
    return { ok: false, message: "Location query is blank." };
  }

  for (const searchName of geocodeSearchQueries(locationQuery)) {
    const hits = await searchGeocodeHits(searchName);
    const best = pickBestGeocodeHit(hits, parsed);
    if (!best) {
      logger.info(
        { locationQuery, searchName, resultCount: hits.length },
        "Geocoding search returned no usable match",
      );
      continue;
    }

    const result: GeocodeResult = {
      latitude: best.latitude,
      longitude: best.longitude,
      label: formatGeocodeLabel(best),
    };
    cacheSet(geocodeCache, normalized, result, GEOCODE_CACHE_TTL_MS);
    logger.info(
      { locationQuery, searchName, label: result.label },
      "Geocoding resolved location",
    );
    return { ok: true, result };
  }

  return {
    ok: false,
    message: `Could not find coordinates for "${locationQuery}". Try a city name such as "Clay" or "Sandpoint", optionally with a state (e.g. "Charleston, WV").`,
  };
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

  const geocoded = await geocodeLocation(trimmed);
  if (!geocoded.ok) {
    return {
      ok: false,
      reason: "geocoding_failed",
      message: geocoded.message,
      locationQuery: trimmed,
    };
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geocoded.result.latitude));
  url.searchParams.set("longitude", String(geocoded.result.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    logger.warn({ err, locationQuery: trimmed }, "Open-Meteo forecast request failed");
    return {
      ok: false,
      reason: "forecast_failed",
      message: "Weather provider request failed.",
      locationQuery: trimmed,
    };
  }

  if (!response.ok) {
    logger.warn(
      {
        locationQuery: trimmed,
        status: response.status,
        statusText: response.statusText,
        latitude: geocoded.result.latitude,
        longitude: geocoded.result.longitude,
      },
      "Open-Meteo forecast returned non-OK status",
    );
    return {
      ok: false,
      reason: "forecast_failed",
      message: `Weather provider returned HTTP ${response.status}.`,
      locationQuery: trimmed,
    };
  }

  let data: {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };

  try {
    data = (await response.json()) as typeof data;
  } catch (err) {
    logger.warn({ err, locationQuery: trimmed }, "Open-Meteo forecast response was not valid JSON");
    return {
      ok: false,
      reason: "malformed_response",
      message: "Weather provider returned invalid JSON.",
      locationQuery: trimmed,
    };
  }

  const currentTemp = data.current?.temperature_2m;
  if (currentTemp == null || !Array.isArray(data.daily?.time)) {
    logger.warn(
      {
        locationQuery: trimmed,
        hasCurrentTemp: currentTemp != null,
        hasDailyTime: Array.isArray(data.daily?.time),
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

  const currentCode = data.current?.weather_code ?? 0;
  const daily: WeatherDaily[] = data.daily.time.slice(0, 5).map((date, index) => {
    const code = data.daily?.weather_code?.[index] ?? 0;
    return {
      date,
      highF: Math.round(data.daily?.temperature_2m_max?.[index] ?? 0),
      lowF: Math.round(data.daily?.temperature_2m_min?.[index] ?? 0),
      weatherCode: code,
      summary: weatherCodeSummary(code),
    };
  });

  const result: WeatherForecastResponse = {
    enabled: true,
    locationLabel: geocoded.result.label,
    current: {
      temperatureF: Math.round(currentTemp),
      weatherCode: currentCode,
      summary: weatherCodeSummary(currentCode),
    },
    daily,
  };

  cacheSet(forecastCache, trimmed.toLowerCase(), result, FORECAST_CACHE_TTL_MS);
  return { ok: true, forecast: result };
}
