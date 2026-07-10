import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  deviceTokensTable,
  type DevicePlatform,
  type DeviceToken,
} from "@workspace/db";

const VALID_PLATFORMS = new Set<DevicePlatform>(["IOS", "ANDROID", "WEB"]);

export function isValidDevicePlatform(value: string): value is DevicePlatform {
  return VALID_PLATFORMS.has(value as DevicePlatform);
}

export type RegisterDeviceTokenInput = {
  userId: string;
  token: string;
  platform: DevicePlatform;
  appVersion?: string | null;
  deviceLabel?: string | null;
};

/**
 * Upsert a device token for a user.
 * If the token already exists for another user (device reassigned), reassign it.
 */
export async function registerDeviceToken(
  input: RegisterDeviceTokenInput,
): Promise<DeviceToken> {
  const token = input.token.trim();
  if (!token) {
    throw new Error("Device token is required");
  }
  if (!isValidDevicePlatform(input.platform)) {
    throw new Error(`Invalid platform: ${input.platform}`);
  }

  const now = new Date();
  const [row] = await db
    .insert(deviceTokensTable)
    .values({
      userId: input.userId,
      token,
      platform: input.platform,
      appVersion: input.appVersion?.trim() || null,
      deviceLabel: input.deviceLabel?.trim() || null,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: deviceTokensTable.token,
      set: {
        userId: input.userId,
        platform: input.platform,
        appVersion: input.appVersion?.trim() || null,
        deviceLabel: input.deviceLabel?.trim() || null,
        lastSeenAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export async function touchDeviceToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;
  await db
    .update(deviceTokensTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(deviceTokensTable.token, trimmed));
}

export async function listDeviceTokensForUser(userId: string): Promise<DeviceToken[]> {
  return db
    .select()
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.userId, userId));
}

export async function listDeviceTokensForUsers(
  userIds: string[],
): Promise<DeviceToken[]> {
  if (userIds.length === 0) return [];
  return db
    .select()
    .from(deviceTokensTable)
    .where(inArray(deviceTokensTable.userId, userIds));
}

/** Remove a specific token for the authenticated user (logout / unregister). */
export async function unregisterDeviceToken(
  userId: string,
  token: string,
): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return false;

  const deleted = await db
    .delete(deviceTokensTable)
    .where(
      and(eq(deviceTokensTable.userId, userId), eq(deviceTokensTable.token, trimmed)),
    )
    .returning({ id: deviceTokensTable.id });

  return deleted.length > 0;
}

/** Remove all tokens for a user (full logout across devices if requested). */
export async function unregisterAllDeviceTokensForUser(userId: string): Promise<number> {
  const deleted = await db
    .delete(deviceTokensTable)
    .where(eq(deviceTokensTable.userId, userId))
    .returning({ id: deviceTokensTable.id });
  return deleted.length;
}

/** Delete tokens that providers reported as invalid / expired. */
export async function removeInvalidDeviceTokens(tokens: string[]): Promise<number> {
  const cleaned = tokens.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return 0;
  const deleted = await db
    .delete(deviceTokensTable)
    .where(inArray(deviceTokensTable.token, cleaned))
    .returning({ id: deviceTokensTable.id });
  return deleted.length;
}
