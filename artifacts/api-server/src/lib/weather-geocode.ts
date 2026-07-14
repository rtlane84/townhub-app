import { US_STATE_BY_ABBR } from "@workspace/api-zod";

export { US_STATE_BY_ABBR };

export type ParsedLocationQuery = {
  city: string;
  regionHint?: string;
  normalizedRegion?: string;
};

export function parseLocationQuery(query: string): ParsedLocationQuery {
  const trimmed = query.trim();
  if (!trimmed) return { city: "" };

  const commaParts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const city = commaParts[0];
    const regionHint = commaParts.slice(1).join(", ");
    return {
      city,
      regionHint,
      normalizedRegion: normalizeRegionHint(regionHint),
    };
  }

  return { city: trimmed };
}

export function normalizeRegionHint(hint: string): string | undefined {
  const trimmed = hint.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (US_STATE_BY_ABBR[upper]) return US_STATE_BY_ABBR[upper];

  return trimmed;
}

export type GeocodeHit = {
  name: string;
  admin1?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
};

export function pickBestGeocodeHit(
  results: GeocodeHit[],
  parsed: ParsedLocationQuery,
): GeocodeHit | null {
  if (results.length === 0) return null;

  const cityLower = parsed.city.toLowerCase();
  const region = parsed.normalizedRegion?.toLowerCase();

  let candidates = results.filter((hit) => hit.name.toLowerCase() === cityLower);
  if (candidates.length === 0) {
    candidates = results.filter((hit) => hit.name.toLowerCase().includes(cityLower));
  }
  if (candidates.length === 0) candidates = results;

  if (region) {
    const byRegion = candidates.filter((hit) => {
      const admin1 = hit.admin1?.toLowerCase() ?? "";
      return admin1 === region || admin1.includes(region) || region.includes(admin1);
    });
    if (byRegion.length > 0) candidates = byRegion;
  }

  const usCandidates = candidates.filter((hit) => hit.country_code === "US");
  if (usCandidates.length > 0) candidates = usCandidates;

  return candidates[0] ?? null;
}

export function formatGeocodeLabel(hit: GeocodeHit): string {
  return [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(", ");
}
