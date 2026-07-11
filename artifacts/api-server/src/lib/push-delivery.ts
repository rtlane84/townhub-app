import { db, notificationLogsTable } from "@workspace/db";
import { logger } from "./logger";
import { logOperationalFailure } from "./operational-log";
import { type NotificationStatus } from "./notification-content";
import { listDeviceTokensForUsers, removeInvalidDeviceTokens } from "./device-tokens";
import { isCategoryEnabledForUser } from "./user-notification-preferences";
import {
  categoryForEventType,
  type NotificationCategoryKey,
} from "./notification-categories";
import { buildPushDataPayload } from "./notification-deep-links";
import { getPushProviderForPlatform } from "./push";
import type { PushMessage, PushPlatform, PushSendResult, PushTarget } from "./push/push-provider";
import type { NotificationEventType } from "./notification-delivery";

function toPushPlatform(platform: string): PushPlatform | null {
  if (platform === "IOS" || platform === "ANDROID" || platform === "WEB") {
    return platform;
  }
  return null;
}

async function logPushDelivery(input: {
  businessId: number;
  eventType: NotificationEventType;
  userId: string;
  body: string;
  subject: string;
  status: NotificationStatus;
  orderId?: number;
  appointmentRequestId?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.insert(notificationLogsTable).values({
      businessId: input.businessId,
      orderId: input.orderId ?? null,
      appointmentRequestId: input.appointmentRequestId ?? null,
      channel: "PUSH",
      eventType: input.eventType,
      type: input.eventType,
      recipientUserId: input.userId,
      subject: input.subject,
      body: input.body,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
    });
  } catch (err) {
    logger.error({ err, eventType: input.eventType }, "Failed to write PUSH notification log");
  }
}

function aggregateStatus(results: PushSendResult[]): NotificationStatus {
  if (results.length === 0) return "LOGGED";
  if (results.some((r) => r.status === "SENT")) return "SENT";
  if (results.every((r) => r.status === "LOGGED")) return "LOGGED";
  return "FAILED";
}

/**
 * Deliver a push notification to all registered devices for the given users.
 * Respects per-user category preferences. Removes invalid tokens automatically.
 */
export async function deliverPushToUsers(input: {
  userIds: string[];
  businessId: number;
  eventType: NotificationEventType;
  title: string;
  body: string;
  deepLink: string;
  orderId?: number;
  appointmentRequestId?: number;
  category?: NotificationCategoryKey | null;
  data?: Record<string, string>;
}): Promise<void> {
  const uniqueUserIds = [...new Set(input.userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return;

  const category =
    input.category ?? categoryForEventType(input.eventType) ?? undefined;

  const eligibleUserIds: string[] = [];
  for (const userId of uniqueUserIds) {
    if (!category) {
      eligibleUserIds.push(userId);
      continue;
    }
    const enabled = await isCategoryEnabledForUser(userId, category);
    if (enabled) eligibleUserIds.push(userId);
  }

  if (eligibleUserIds.length === 0) return;

  const devices = await listDeviceTokensForUsers(eligibleUserIds);
  if (devices.length === 0) {
    for (const userId of eligibleUserIds) {
      await logPushDelivery({
        businessId: input.businessId,
        eventType: input.eventType,
        userId,
        subject: input.title,
        body: input.body,
        status: "LOGGED",
        orderId: input.orderId,
        appointmentRequestId: input.appointmentRequestId,
        errorMessage: "No registered devices",
      });
    }
    return;
  }

  const data = buildPushDataPayload({
    deepLink: input.deepLink,
    category,
    eventType: input.eventType,
    orderId: input.orderId,
    appointmentRequestId: input.appointmentRequestId,
    businessId: input.businessId,
  });

  const message: PushMessage = {
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
    data: { ...data, ...(input.data ?? {}) },
    collapseKey: input.eventType,
  };

  const byPlatform = new Map<PushPlatform, PushTarget[]>();

  for (const device of devices) {
    const platform = toPushPlatform(device.platform);
    if (!platform) continue;
    const list = byPlatform.get(platform) ?? [];
    list.push({ token: device.token, platform, userId: device.userId });
    byPlatform.set(platform, list);
  }

  const allResults: PushSendResult[] = [];

  for (const [platform, targets] of byPlatform) {
    const provider = getPushProviderForPlatform(platform);
    if (!provider) {
      for (const t of targets) {
        allResults.push({
          token: t.token,
          platform,
          userId: t.userId,
          status: "FAILED",
          error: `No push provider for ${platform}`,
        });
      }
      continue;
    }
    const results = await provider.send(targets, message);
    allResults.push(...results);
  }

  const invalidTokens = allResults
    .filter((r) => r.status === "INVALID_TOKEN")
    .map((r) => r.token);
  if (invalidTokens.length > 0) {
    await removeInvalidDeviceTokens(invalidTokens);
  }

  const byUser = new Map<string, PushSendResult[]>();
  for (const result of allResults) {
    const list = byUser.get(result.userId) ?? [];
    list.push(result);
    byUser.set(result.userId, list);
  }

  for (const userId of eligibleUserIds) {
    const results = byUser.get(userId) ?? [];
    const status = results.length === 0 ? "LOGGED" : aggregateStatus(results);
    const error =
      results
        .filter((r) => r.status === "FAILED" || r.status === "INVALID_TOKEN")
        .map((r) => r.error)
        .filter(Boolean)
        .join("; ") || undefined;

    if (status === "FAILED") {
      logOperationalFailure("push_notification_failed", {
        eventType: input.eventType,
        businessId: input.businessId,
        orderId: input.orderId,
        userId,
      });
    }

    await logPushDelivery({
      businessId: input.businessId,
      eventType: input.eventType,
      userId,
      subject: input.title,
      body: input.body,
      status,
      orderId: input.orderId,
      appointmentRequestId: input.appointmentRequestId,
      errorMessage: error,
    });
  }
}
