import type { FoodTruckLocation, FoodTruckLocationInput } from "@workspace/api-client-react";

export type FoodTruckLocationFormValues = {
  locationName: string;
  address: string;
  latitude: string;
  longitude: string;
  locationDate: string;
  startTime: string;
  endTime: string;
  locationNotes: string;
  isActive: boolean;
};

export const BLANK_FOOD_TRUCK_LOCATION_FORM: FoodTruckLocationFormValues = {
  locationName: "",
  address: "",
  latitude: "",
  longitude: "",
  locationDate: "",
  startTime: "",
  endTime: "",
  locationNotes: "",
  isActive: true,
};

export function foodTruckLocationToFormValues(loc: FoodTruckLocation): FoodTruckLocationFormValues {
  return {
    locationName: loc.locationName,
    address: loc.address ?? "",
    latitude: loc.latitude ?? "",
    longitude: loc.longitude ?? "",
    locationDate: loc.locationDate,
    startTime: loc.startTime ?? "",
    endTime: loc.endTime ?? "",
    locationNotes: loc.locationNotes ?? "",
    isActive: loc.isActive,
  };
}

export function isFoodTruckLocationFormDirty(
  initial: FoodTruckLocationFormValues | null,
  current: FoodTruckLocationFormValues,
): boolean {
  if (!initial) return true;
  return (Object.keys(initial) as (keyof FoodTruckLocationFormValues)[]).some(
    (key) => initial[key] !== current[key],
  );
}

export function validateFoodTruckCoordinates(latitude: string, longitude: string): string | null {
  const lat = latitude.trim();
  const lng = longitude.trim();
  if (!lat && !lng) return null;
  if (Boolean(lat) !== Boolean(lng)) {
    return "Provide both latitude and longitude, or leave both blank.";
  }
  const latNum = Number.parseFloat(lat);
  const lngNum = Number.parseFloat(lng);
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return "Latitude must be a number between -90 and 90.";
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    return "Longitude must be a number between -180 and 180.";
  }
  return null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function buildFoodTruckLocationPayload(
  form: FoodTruckLocationFormValues,
  mode: "create" | "update",
): FoodTruckLocationInput {
  const normalize = mode === "update" ? emptyToNull : emptyToUndefined;

  return {
    locationName: form.locationName.trim(),
    locationDate: form.locationDate,
    address: normalize(form.address) ?? null,
    latitude: normalize(form.latitude) ?? null,
    longitude: normalize(form.longitude) ?? null,
    startTime: normalize(form.startTime) ?? null,
    endTime: normalize(form.endTime) ?? null,
    locationNotes: normalize(form.locationNotes) ?? null,
    isActive: form.isActive,
  };
}

export function canSaveFoodTruckLocationForm(
  form: FoodTruckLocationFormValues,
  options: { editing: boolean; initial: FoodTruckLocationFormValues | null },
): boolean {
  if (!form.locationName.trim() || !form.locationDate) return false;
  if (validateFoodTruckCoordinates(form.latitude, form.longitude)) return false;
  if (options.editing && !isFoodTruckLocationFormDirty(options.initial, form)) return false;
  return true;
}

export function getFoodTruckMapEmptyMessage(todayTruckCount: number): {
  title: string;
  description: string;
} {
  if (todayTruckCount > 0) {
    return {
      title: "Food truck locations are listed above.",
      description: "We couldn't place them on the map from the saved address. Try a full street address or add coordinates.",
    };
  }
  return {
    title: "No mapped food truck locations today.",
    description: "When trucks are scheduled with coordinates, they will appear here.",
  };
}
