import { isUsStateAbbreviation, normalizeUsZipForLookup } from "@workspace/api-zod";
import { logger } from "./logger";

export type UsZipLookupResult = {
  zip: string;
  city: string;
  state: string;
};

type CacheEntry = {
  expiresAt: number;
  value: UsZipLookupResult | null;
};

const ZIP_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const zipCache = new Map<string, CacheEntry>();

type ZippopotamPlace = {
  "place name"?: string;
  "state abbreviation"?: string;
  state?: string;
};

type ZippopotamResponse = {
  places?: ZippopotamPlace[];
  "post code"?: string;
};

function cacheGet(key: string): UsZipLookupResult | null | undefined {
  const entry = zipCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    zipCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key: string, value: UsZipLookupResult | null): void {
  zipCache.set(key, { value, expiresAt: Date.now() + ZIP_CACHE_TTL_MS });
}

/** Cleared between tests. */
export function clearUsZipLookupCache(): void {
  zipCache.clear();
}

export async function lookupUsZip(zipInput: string): Promise<UsZipLookupResult | null> {
  const zip = normalizeUsZipForLookup(zipInput);
  if (!zip) return null;

  const cached = cacheGet(zip);
  if (cached !== undefined) return cached;

  const url = `https://api.zippopotam.us/us/${zip}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    logger.warn({ err, zip }, "Zippopotam ZIP lookup request failed");
    return null;
  }

  if (response.status === 404) {
    cacheSet(zip, null);
    return null;
  }

  if (!response.ok) {
    logger.warn(
      { zip, status: response.status, statusText: response.statusText },
      "Zippopotam ZIP lookup returned non-OK status",
    );
    return null;
  }

  let body: ZippopotamResponse;
  try {
    body = (await response.json()) as ZippopotamResponse;
  } catch (err) {
    logger.warn({ err, zip }, "Zippopotam ZIP lookup returned invalid JSON");
    return null;
  }

  const place = body.places?.[0];
  const city = place?.["place name"]?.trim() ?? "";
  const stateRaw = place?.["state abbreviation"]?.trim() ?? "";
  const state = stateRaw.toUpperCase();

  if (!city || !isUsStateAbbreviation(state)) {
    logger.info({ zip }, "Zippopotam ZIP lookup returned incomplete place data");
    cacheSet(zip, null);
    return null;
  }

  const result: UsZipLookupResult = {
    zip: body["post code"]?.trim() || zip,
    city,
    state,
  };
  cacheSet(zip, result);
  return result;
}
