import type { PlatformTheme } from "@workspace/api-client-react";

const STORAGE_KEY = "townhub:platform-theme-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Minimal shape check so we never hydrate garbage into React Query. */
export function isValidCachedPlatformTheme(
  value: unknown,
): value is PlatformTheme {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.primaryColor === "string" &&
    typeof value.accentColor === "string" &&
    typeof value.backgroundColor === "string" &&
    typeof value.buttonColor === "string"
  );
}

export function readCachedPlatformTheme(): PlatformTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidCachedPlatformTheme(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedPlatformTheme(theme: PlatformTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // ignore quota / private-mode failures
  }
}

export function clearCachedPlatformTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
