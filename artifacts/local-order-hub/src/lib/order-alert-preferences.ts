const STORAGE_KEY = "local-order-hub:order-sounds-enabled";

export function getOrderSoundsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOrderSoundsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // ignore storage failures
  }
}
