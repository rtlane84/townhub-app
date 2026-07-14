import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_PLATFORM_TIMEZONE,
  resolvePlatformTimeZone,
} from "@workspace/api-zod";

const CACHE_TTL_MS = 60_000;

let cached: { timeZone: string; expiresAt: number } | null = null;

/** Drop cached platform timezone (call after admin theme updates). */
export function invalidatePlatformTimeZoneCache(): void {
  cached = null;
}

/**
 * Platform IANA timezone for civil "today", public hours, and mobile schedules.
 * Cached briefly to avoid a DB round-trip on every business serialize.
 */
export async function getPlatformTimeZone(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.timeZone;
  }

  try {
    const [row] = await db
      .select({ timezone: platformSettingsTable.timezone })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1);

    const timeZone = resolvePlatformTimeZone(row?.timezone);
    cached = { timeZone, expiresAt: now + CACHE_TTL_MS };
    return timeZone;
  } catch {
    // Missing column / DB blip — fail safe to default; do not long-cache errors.
    return DEFAULT_PLATFORM_TIMEZONE;
  }
}
