import crypto from "node:crypto";
import { getOrderAccessSecret } from "./order-access-token";

const LOCAL_MEDIA_URL_TTL_MS = 60 * 60 * 1000;

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getOrderAccessSecret()).update(payload).digest("base64url");
}

export function signLocalMediaFileUrl(storedFilename: string, nowMs = Date.now()): string {
  const expiresAt = Math.floor((nowMs + LOCAL_MEDIA_URL_TTL_MS) / 1000);
  const mac = signPayload(`media:${storedFilename}:${expiresAt}`);
  return `/api/media/files/${storedFilename}?exp=${expiresAt}&sig=${encodeURIComponent(mac)}`;
}

export function verifyLocalMediaFileAccess(
  storedFilename: string,
  expRaw: string | undefined,
  sigRaw: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!expRaw || !sigRaw) return false;
  const expiresAt = parseInt(expRaw, 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(nowMs / 1000)) {
    return false;
  }

  const expected = signPayload(`media:${storedFilename}:${expiresAt}`);
  const provided = decodeURIComponent(sigRaw);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
