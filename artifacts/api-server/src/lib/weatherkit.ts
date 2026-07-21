import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { logger } from "./logger";

type WeatherKitConfig = {
  keyId: string;
  teamId: string;
  serviceId: string;
  privateKeyPem: string;
};

type WeatherKitResponse = {
  currentWeather?: {
    temperature?: number;
    conditionCode?: string;
  };
  forecastDaily?: {
    days?: Array<{
      forecastStart?: string;
      temperatureMax?: number;
      temperatureMin?: number;
      conditionCode?: string;
      precipitationChance?: number;
    }>;
  };
  weatherAlerts?: {
    alerts?: Array<{ summary?: string; detailsUrl?: string; severity?: string }>;
  };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64Url(value: string | Buffer): string {
  return (typeof value === "string" ? Buffer.from(value) : value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getConfig(): WeatherKitConfig | null {
  const keyId = process.env.WEATHERKIT_KEY_ID?.trim();
  const teamId = process.env.WEATHERKIT_TEAM_ID?.trim();
  const serviceId = process.env.WEATHERKIT_SERVICE_ID?.trim();
  const inlineKey = process.env.WEATHERKIT_PRIVATE_KEY?.trim();
  const keyPath = process.env.WEATHERKIT_PRIVATE_KEY_PATH?.trim();
  let privateKeyPem = inlineKey?.replace(/\\n/g, "\n");
  if (!privateKeyPem && keyPath) {
    try {
      privateKeyPem = readFileSync(keyPath, "utf8");
    } catch (err) {
      logger.warn({ err }, "Failed to read WEATHERKIT_PRIVATE_KEY_PATH");
    }
  }
  if (!keyId || !teamId || !serviceId || !privateKeyPem) return null;
  return { keyId, teamId, serviceId, privateKeyPem };
}

export function isWeatherKitConfigured(): boolean {
  return getConfig() != null;
}

function createDeveloperToken(config: WeatherKitConfig): string {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({
      alg: "ES256",
      kid: config.keyId,
      id: `${config.teamId}.${config.serviceId}`,
    }),
  );
  const claims = base64Url(JSON.stringify({ iss: config.teamId, iat: now, exp: now + 3600, sub: config.serviceId }));
  const input = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: createPrivateKey(config.privateKeyPem),
    dsaEncoding: "ieee-p1363",
  });
  const value = `${input}.${base64Url(signature)}`;
  cachedToken = { value, expiresAt: Date.now() + 50 * 60_000 };
  return value;
}

export async function fetchWeatherKit(
  latitude: number,
  longitude: number,
  timezone: string,
): Promise<WeatherKitResponse> {
  const config = getConfig();
  if (!config) throw new Error("WeatherKit is not configured.");
  const url = new URL(
    `https://weatherkit.apple.com/api/v1/weather/en-US/${latitude}/${longitude}`,
  );
  url.searchParams.set("countryCode", "US");
  url.searchParams.set("timezone", timezone);
  url.searchParams.set(
    "dataSets",
    "currentWeather,forecastDaily,forecastHourly,forecastNextHour,weatherAlerts",
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${createDeveloperToken(config)}` },
  });
  if (!response.ok) {
    throw new Error(`WeatherKit returned HTTP ${response.status}.`);
  }
  return (await response.json()) as WeatherKitResponse;
}

export function resetWeatherKitTokenForTests(): void {
  cachedToken = null;
}

export function logWeatherKitError(err: unknown): void {
  logger.warn({ err }, "WeatherKit request failed");
}
