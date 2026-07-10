/**
 * Pure selection helper for multi-business dashboard context.
 */
export function resolveSelectedBusinessId(
  ownedIds: number[],
  requestedId: number | null | undefined,
  fallbackId: number | null | undefined,
): number | null {
  if (requestedId != null && ownedIds.includes(requestedId)) {
    return requestedId;
  }
  if (fallbackId != null && ownedIds.includes(fallbackId)) {
    return fallbackId;
  }
  return ownedIds[0] ?? null;
}

export const SELECTED_BUSINESS_STORAGE_KEY = "local-order-hub:selected-business-id";

export function readStoredBusinessId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SELECTED_BUSINESS_STORAGE_KEY);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function writeStoredBusinessId(id: number | null): void {
  if (typeof window === "undefined") return;
  if (id == null) {
    window.localStorage.removeItem(SELECTED_BUSINESS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SELECTED_BUSINESS_STORAGE_KEY, String(id));
}
