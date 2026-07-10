export interface NotificationPreferences {
  soundsEnabled: boolean;
  volume: number;
}

const STORAGE_PREFIX = "local-order-hub:notification-prefs:";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  soundsEnabled: false,
  volume: 80,
};

const LEGACY_SOUND_KEY = "local-order-hub:order-sounds-enabled";

function storageKey(businessId: number): string {
  return `${STORAGE_PREFIX}${businessId}`;
}

function readRaw(businessId: number): Partial<NotificationPreferences> | null {
  try {
    const raw = localStorage.getItem(storageKey(businessId));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<NotificationPreferences>;
  } catch {
    return null;
  }
}

function migrateLegacySoundEnabled(): boolean {
  try {
    return localStorage.getItem(LEGACY_SOUND_KEY) === "true";
  } catch {
    return false;
  }
}

function buildPreferences(
  stored: Partial<NotificationPreferences> | null,
  legacySounds: boolean,
): NotificationPreferences {
  return {
    soundsEnabled: stored?.soundsEnabled ?? legacySounds,
    volume: clampVolume(stored?.volume ?? DEFAULT_NOTIFICATION_PREFERENCES.volume),
  };
}

const snapshotCache = new Map<number, { cacheKey: string; snapshot: NotificationPreferences }>();

function snapshotCacheKey(businessId: number): string {
  const raw = localStorage.getItem(storageKey(businessId)) ?? "";
  return `${raw}|${migrateLegacySoundEnabled()}`;
}

function invalidateSnapshotCache(businessId: number): void {
  snapshotCache.delete(businessId);
}

export function getNotificationPreferences(businessId: number): NotificationPreferences {
  const cacheKey = snapshotCacheKey(businessId);
  const cached = snapshotCache.get(businessId);
  if (cached && cached.cacheKey === cacheKey) {
    return cached.snapshot;
  }

  const snapshot = buildPreferences(readRaw(businessId), migrateLegacySoundEnabled());
  snapshotCache.set(businessId, { cacheKey, snapshot });
  return snapshot;
}

export function setNotificationPreferences(
  businessId: number,
  patch: Partial<NotificationPreferences>,
): NotificationPreferences {
  invalidateSnapshotCache(businessId);
  const current = getNotificationPreferences(businessId);
  const next: NotificationPreferences = {
    ...current,
    ...patch,
    volume: patch.volume != null ? clampVolume(patch.volume) : current.volume,
  };
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify(next));
    invalidateSnapshotCache(businessId);
    window.dispatchEvent(new CustomEvent("notification-preferences-changed", { detail: { businessId } }));
  } catch {
    // ignore storage failures
  }
  return next;
}

function clampVolume(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return DEFAULT_NOTIFICATION_PREFERENCES.volume;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function subscribeNotificationPreferences(
  businessId: number,
  onChange: () => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ businessId?: number }>).detail;
    if (!detail?.businessId || detail.businessId === businessId) {
      onChange();
    }
  };
  window.addEventListener("notification-preferences-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("notification-preferences-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
