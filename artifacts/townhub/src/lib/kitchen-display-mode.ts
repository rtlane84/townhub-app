const KITCHEN_DISPLAY_MODE_STORAGE_KEY = "townhub.kitchenDisplayMode";

export function isKitchenDisplayRoute(location: string): boolean {
  return (
    location === "/dashboard/business/kitchen" ||
    location.startsWith("/dashboard/business/kitchen/")
  );
}

export function readKitchenDisplayModePreference(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(KITCHEN_DISPLAY_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeKitchenDisplayModePreference(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KITCHEN_DISPLAY_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}
