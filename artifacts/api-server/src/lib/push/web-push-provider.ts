import { logger } from "../logger";
import type {
  PushDeliveryProvider,
  PushMessage,
  PushSendResult,
  PushTarget,
} from "./push-provider";

/**
 * Web Push (VAPID) provider stub.
 *
 * Future env:
 * - WEB_PUSH_VAPID_PUBLIC_KEY
 * - WEB_PUSH_VAPID_PRIVATE_KEY
 * - WEB_PUSH_VAPID_SUBJECT (mailto: or https:)
 */

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() &&
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
  );
}

export function createWebPushProvider(): PushDeliveryProvider {
  return {
    id: "web-push",
    platforms: ["WEB"] as const,
    isConfigured: isWebPushConfigured,
    async send(targets: PushTarget[], message: PushMessage): Promise<PushSendResult[]> {
      const webTargets = targets.filter((t) => t.platform === "WEB");
      if (webTargets.length === 0) return [];

      if (!isWebPushConfigured()) {
        logger.info(
          { count: webTargets.length, title: message.title },
          "[PUSH LOG] Web Push not configured — logged only",
        );
        return webTargets.map((t) => ({
          token: t.token,
          platform: t.platform,
          userId: t.userId,
          status: "LOGGED" as const,
          error: "Web Push not configured",
        }));
      }

      logger.warn(
        { count: webTargets.length },
        "Web Push VAPID credentials present but sender is not implemented yet",
      );
      return webTargets.map((t) => ({
        token: t.token,
        platform: t.platform,
        userId: t.userId,
        status: "FAILED" as const,
        error: "Web Push sender not implemented",
      }));
    },
  };
}
