import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildFoodTruckGeocodeQuery,
  geocodeAddress,
  hasValidStoredCoordinates,
} from "./address-geocode";
import type { LocationInput, LocationUpdateInput } from "./food-truck-location";

type LocationLike = {
  id?: number;
  locationName: string;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export async function getPlatformTownHint(): Promise<string | null> {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.id, 1));
  return row?.townName?.trim() || null;
}

async function geocodeAndFormatCoords(
  location: LocationLike,
  townHint: string | null,
): Promise<{ latitude: string; longitude: string } | null> {
  const query = buildFoodTruckGeocodeQuery(location, townHint);
  if (!query) return null;

  const coords = await geocodeAddress(query);
  if (!coords) return null;

  return {
    latitude: String(coords.lat),
    longitude: String(coords.lng),
  };
}

function coordinatesExplicitlyCleared(data: LocationUpdateInput): boolean {
  return data.latitude === null && data.longitude === null;
}

export async function enrichLocationInputWithGeocode(
  data: LocationInput,
  townHint: string | null,
): Promise<LocationInput> {
  if (hasValidStoredCoordinates(data.latitude, data.longitude)) return data;

  const geocoded = await geocodeAndFormatCoords(
    {
      locationName: data.locationName,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    townHint,
  );
  if (!geocoded) return data;

  return {
    ...data,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}

export async function enrichLocationUpdateWithGeocode(
  data: LocationUpdateInput,
  existing: LocationLike,
  townHint: string | null,
): Promise<LocationUpdateInput> {
  if (coordinatesExplicitlyCleared(data)) {
    return data;
  }

  const merged: LocationLike = {
    locationName: data.locationName ?? existing.locationName,
    address: data.address !== undefined ? data.address : existing.address,
    latitude: data.latitude !== undefined ? data.latitude : existing.latitude,
    longitude: data.longitude !== undefined ? data.longitude : existing.longitude,
  };

  if (hasValidStoredCoordinates(merged.latitude, merged.longitude)) {
    return data;
  }

  const geocoded = await geocodeAndFormatCoords(merged, townHint);
  if (!geocoded) return data;

  return {
    ...data,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}

/** Geocode for map display only — does not write coordinates back to the database. */
export async function resolvePublicLocationCoordinates<T extends LocationLike & { id: number }>(
  row: T,
  townHint: string | null,
): Promise<T> {
  if (hasValidStoredCoordinates(row.latitude, row.longitude)) return row;

  const geocoded = await geocodeAndFormatCoords(row, townHint);
  if (!geocoded) return row;

  return {
    ...row,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}
