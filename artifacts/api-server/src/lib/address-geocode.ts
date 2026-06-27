import { logger } from "./logger";

type GeocodeResult = {
  lat: number;
  lng: number;
};

type CacheEntry = {
  expiresAt: number;
  value: GeocodeResult;
};

const GEOCODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NOMINATIM_MIN_INTERVAL_MS = 1100;

const geocodeCache = new Map<string, CacheEntry>();
let lastNominatimRequestAt = 0;

function cacheGet(key: string): GeocodeResult | null {
  const entry = geocodeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geocodeCache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: GeocodeResult): void {
  geocodeCache.set(key, { value, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
}

function geocodeUserAgent(): string {
  const configured = process.env.GEOCODE_USER_AGENT?.trim();
  if (configured) return configured;
  const site = process.env.PLATFORM_URL?.trim() || "http://localhost:8080";
  return `LocalOrderHub/1.0 (${site})`;
}

async function waitForNominatimSlot(): Promise<void> {
  const elapsed = Date.now() - lastNominatimRequestAt;
  const waitMs = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - elapsed);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastNominatimRequestAt = Date.now();
}

type NominatimHit = {
  lat: string;
  lon: string;
};

export function hasValidStoredCoordinates(
  latitude?: string | null,
  longitude?: string | null,
): boolean {
  const lat = Number.parseFloat(latitude?.trim() ?? "");
  const lng = Number.parseFloat(longitude?.trim() ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function buildFoodTruckGeocodeQuery(
  location: { address?: string | null; locationName: string },
  townHint?: string | null,
): string | null {
  const address = location.address?.trim();
  const locationName = location.locationName.trim();
  const town = townHint?.trim();

  const base = address || locationName;
  if (!base) return null;

  if (!town) return base;

  const baseLower = base.toLowerCase();
  const townLower = town.toLowerCase();
  if (baseLower.includes(townLower)) return base;

  return `${base}, ${town}`;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  await waitForNominatimSlot();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": geocodeUserAgent(),
        Accept: "application/json",
      },
    });
  } catch (err) {
    logger.warn({ err, query: trimmed }, "Nominatim geocoding request failed");
    return null;
  }

  if (!response.ok) {
    logger.warn(
      { query: trimmed, status: response.status, statusText: response.statusText },
      "Nominatim geocoding returned non-OK status",
    );
    return null;
  }

  const results = (await response.json()) as NominatimHit[];
  const hit = results[0];
  if (!hit) {
    logger.info({ query: trimmed }, "Nominatim geocoding returned no results");
    return null;
  }

  const lat = Number.parseFloat(hit.lat);
  const lng = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const result = { lat, lng };
  cacheSet(cacheKey, result);
  logger.info({ query: trimmed, lat, lng }, "Geocoded address for food truck location");
  return result;
}
