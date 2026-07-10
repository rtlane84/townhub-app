import { logger } from "../logger";
import type {
  PushDeliveryProvider,
  PushMessage,
  PushSendResult,
  PushTarget,
} from "./push-provider";

/**
 * Firebase Cloud Messaging provider stub for Android (and optional multi-platform).
 *
 * Not wired for production sends yet — returns LOGGED when FCM env is unset,
 * or FAILED with a clear message when env is present but the HTTP client is
 * not implemented. Keeps the adapter surface ready for minimal future work.
 *
 * Future env:
 * - FCM_PROJECT_ID
 * - FCM_CLIENT_EMAIL
 * - FCM_PRIVATE_KEY
 * - or FCM_SERVER_KEY (legacy)
 */

export function isFcmConfigured(): boolean {
  return Boolean(
    process.env.FCM_PROJECT_ID?.trim() &&
      process.env.FCM_CLIENT_EMAIL?.trim() &&
      process.env.FCM_PRIVATE_KEY?.trim(),
  );
}

export function createFcmPushProvider(): PushDeliveryProvider {
  return {
    id: "fcm",
    platforms: ["ANDROID"] as const,
    isConfigured: isFcmConfigured,
    async send(targets: PushTarget[], message: PushMessage): Promise<PushSendResult[]> {
      const androidTargets = targets.filter((t) => t.platform === "ANDROID");
      if (androidTargets.length === 0) return [];

      if (!isFcmConfigured()) {
        logger.info(
          { count: androidTargets.length, title: message.title },
          "[PUSH LOG] FCM not configured — Android push logged only",
        );
        return androidTargets.map((t) => ({
          token: t.token,
          platform: t.platform,
          userId: t.userId,
          status: "LOGGED" as const,
          error: "FCM not configured",
        }));
      }

      // Adapter reserved for Firebase Admin / HTTP v1 implementation.
      logger.warn(
        { count: androidTargets.length },
        "FCM credentials present but FCM HTTP sender is not implemented yet",
      );
      return androidTargets.map((t) => ({
        token: t.token,
        platform: t.platform,
        userId: t.userId,
        status: "FAILED" as const,
        error: "FCM sender not implemented",
      }));
    },
  };
}
