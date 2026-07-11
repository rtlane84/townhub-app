import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { logger } from "../logger";
import type {
  PushDeliveryProvider,
  PushMessage,
  PushSendResult,
  PushTarget,
} from "./push-provider";

/**
 * APNs HTTP/2 provider using a .p8 key (token-based auth).
 *
 * Env:
 * - APNS_KEY_ID
 * - APNS_TEAM_ID
 * - APNS_BUNDLE_ID (defaults to com.lanetech.townhub)
 * - APNS_PRIVATE_KEY  (PEM contents, newlines as \n) OR APNS_PRIVATE_KEY_PATH
 * - APNS_PRODUCTION   ("true" for production APNs, otherwise sandbox)
 */

type ApnsConfig = {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKeyPem: string;
  production: boolean;
};

let cachedJwt: { token: string; expiresAtMs: number } | null = null;

function readPrivateKeyPem(): string | null {
  const inline = process.env.APNS_PRIVATE_KEY?.trim();
  if (inline) {
    return inline.replace(/\\n/g, "\n");
  }
  const keyPath = process.env.APNS_PRIVATE_KEY_PATH?.trim();
  if (keyPath) {
    try {
      return readFileSync(keyPath, "utf8");
    } catch (err) {
      logger.error({ err, path: keyPath }, "Failed to read APNS_PRIVATE_KEY_PATH");
      return null;
    }
  }
  return null;
}

export function getApnsConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const privateKeyPem = readPrivateKeyPem();
  if (!keyId || !teamId || !privateKeyPem) return null;

  return {
    keyId,
    teamId,
    bundleId: process.env.APNS_BUNDLE_ID?.trim() || "com.lanetech.townhub",
    privateKeyPem,
    production: process.env.APNS_PRODUCTION === "true",
  };
}

export function isApnsConfigured(): boolean {
  return getApnsConfig() != null;
}

function base64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createApnsJwt(config: ApnsConfig): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAtMs > Date.now() + 60_000) {
    return cachedJwt.token;
  }

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64Url(JSON.stringify({ iss: config.teamId, iat: now }));
  const signingInput = `${header}.${claims}`;

  const key = createPrivateKey(config.privateKeyPem);
  const signature = sign("sha256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${signingInput}.${base64Url(signature)}`;
  cachedJwt = { token, expiresAtMs: Date.now() + 50 * 60_000 };
  return token;
}

function apnsHost(production: boolean): string {
  return production ? "api.push.apple.com" : "api.sandbox.push.apple.com";
}

async function postApnsNotification(input: {
  config: ApnsConfig;
  token: string;
  message: PushMessage;
  jwt: string;
}): Promise<Omit<PushSendResult, "userId" | "platform">> {
  const { config, token, message, jwt } = input;
  const host = apnsHost(config.production);
  const url = `https://${host}/3/device/${encodeURIComponent(token)}`;

  const payload = {
    aps: {
      alert: {
        title: message.title,
        body: message.body,
      },
      sound: message.sound ?? "default",
      ...(message.badge != null ? { badge: message.badge } : {}),
      "mutable-content": 1,
    },
    deepLink: message.deepLink,
    ...(message.data ?? {}),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": config.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        ...(message.collapseKey
          ? { "apns-collapse-id": message.collapseKey.slice(0, 64) }
          : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 200) {
      const apnsId = response.headers.get("apns-id") ?? undefined;
      return { token, status: "SENT", providerMessageId: apnsId };
    }

    let reason = `APNs HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { reason?: string };
      if (body.reason) reason = body.reason;
    } catch {
      // ignore parse errors
    }

    const invalid =
      response.status === 410 ||
      reason === "BadDeviceToken" ||
      reason === "Unregistered" ||
      reason === "ExpiredToken" ||
      reason === "DeviceTokenNotForTopic";

    return {
      token,
      status: invalid ? "INVALID_TOKEN" : "FAILED",
      error: reason,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "APNs request failed";
    logger.error({ err, tokenPrefix: token.slice(0, 8) }, "APNs send failed");
    return { token, status: "FAILED", error };
  }
}

export function createApnsPushProvider(): PushDeliveryProvider {
  return {
    id: "apns",
    platforms: ["IOS"] as const,
    isConfigured: isApnsConfigured,
    async send(targets: PushTarget[], message: PushMessage): Promise<PushSendResult[]> {
      const config = getApnsConfig();
      if (!config) {
        return targets.map((t) => ({
          token: t.token,
          platform: t.platform,
          userId: t.userId,
          status: "LOGGED" as const,
          error: "APNs not configured",
        }));
      }

      const iosTargets = targets.filter((t) => t.platform === "IOS");
      if (iosTargets.length === 0) return [];

      let jwt: string;
      try {
        jwt = createApnsJwt(config);
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to create APNs JWT";
        logger.error({ err }, "APNs JWT creation failed");
        return iosTargets.map((t) => ({
          token: t.token,
          platform: t.platform,
          userId: t.userId,
          status: "FAILED" as const,
          error,
        }));
      }

      const results: PushSendResult[] = [];
      // Sequential to avoid hammering APNs from a single process; volume is low today.
      for (const target of iosTargets) {
        const result = await postApnsNotification({
          config,
          token: target.token,
          message,
          jwt,
        });
        results.push({
          ...result,
          platform: target.platform,
          userId: target.userId,
        });
      }
      return results;
    },
  };
}

/** Reset JWT cache (tests). */
export function resetApnsJwtCache(): void {
  cachedJwt = null;
}
