const DIRECTORY_CACHE_TTL_MS = 15_000;
const DIRECTORY_CACHE_MAX_ENTRIES = 32;

type DirectoryCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const directoryCache = new Map<string, DirectoryCacheEntry>();

export function getPublicBusinessDirectoryCache<T>(key: string): T | undefined {
  const entry = directoryCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    directoryCache.delete(key);
    return undefined;
  }

  // Refresh insertion order so frequently used directory variants remain cached.
  directoryCache.delete(key);
  directoryCache.set(key, entry);
  return entry.value as T;
}

export function setPublicBusinessDirectoryCache<T>(
  key: string,
  value: T,
): void {
  directoryCache.delete(key);
  directoryCache.set(key, {
    expiresAt: Date.now() + DIRECTORY_CACHE_TTL_MS,
    value,
  });

  while (directoryCache.size > DIRECTORY_CACHE_MAX_ENTRIES) {
    const oldestKey = directoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    directoryCache.delete(oldestKey);
  }
}

export function invalidatePublicBusinessDirectoryCache(): void {
  directoryCache.clear();
}
