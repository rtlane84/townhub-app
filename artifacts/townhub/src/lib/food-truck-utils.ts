import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { formatCivilDateHeading, formatTimeRange12h } from "@workspace/api-zod";
import { directionsUrl, type DirectionsPlatform } from "./directions.ts";

export function formatFoodTruckTimeWindow(
  startTime?: string | null,
  endTime?: string | null,
): string | null {
  return formatTimeRange12h(startTime, endTime);
}

/** Civil YYYY-MM-DD heading without parseISO UTC day-shift. */
export function formatFoodTruckDateHeading(date: string): string {
  return formatCivilDateHeading(date);
}

export function foodTruckDirectionsUrl(
  truck: FoodTruckLocationWithBusiness,
  platform?: DirectionsPlatform,
): string {
  const lat = truck.latitude?.trim();
  const lng = truck.longitude?.trim();
  if (lat && lng) {
    return directionsUrl(`${lat},${lng}`, platform);
  }
  const query = truck.address?.trim() || truck.locationName;
  return directionsUrl(query, platform);
}

export type FoodTruckMapPoint = FoodTruckLocationWithBusiness & {
  lat: number;
  lng: number;
};

export function parseFoodTruckCoordinates(
  truck: FoodTruckLocationWithBusiness,
): { lat: number; lng: number } | null {
  const lat = Number.parseFloat(truck.latitude?.trim() ?? "");
  const lng = Number.parseFloat(truck.longitude?.trim() ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function getMappableFoodTrucks(
  trucks: FoodTruckLocationWithBusiness[],
): FoodTruckMapPoint[] {
  return trucks.flatMap((truck) => {
    const coords = parseFoodTruckCoordinates(truck);
    return coords ? [{ ...truck, ...coords }] : [];
  });
}

export function foodTruckOrderingEnabled(truck: FoodTruckLocationWithBusiness): boolean {
  return truck.pickupEnabled === true;
}

export function groupFoodTrucksByDate(
  locations: FoodTruckLocationWithBusiness[],
): Array<[string, FoodTruckLocationWithBusiness[]]> {
  const grouped = new Map<string, FoodTruckLocationWithBusiness[]>();
  for (const location of locations) {
    const list = grouped.get(location.locationDate) ?? [];
    list.push(location);
    grouped.set(location.locationDate, list);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}
