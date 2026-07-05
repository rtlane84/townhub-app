import crypto from "node:crypto";

const DEV_FALLBACK_SECRET = "dev-order-access-token-secret-min-32-chars";
/** Default guest token lifetime — long enough for email links, bounded for security. */
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function getOrderAccessSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required for order access tokens in production");
  }
  return DEV_FALLBACK_SECRET;
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", getOrderAccessSecret()).update(payload).digest("base64url");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Legacy v1 token (no expiry) — still accepted during transition. */
function createLegacyOrderAccessToken(orderId: number): string {
  return signPayload(`order:${orderId}`);
}

/** Stateless HMAC token proving access to a guest order confirmation / checkout flow. */
export function createOrderAccessToken(orderId: number, nowMs = Date.now()): string {
  const expiresAt = Math.floor((nowMs + TOKEN_TTL_MS) / 1000);
  const signature = signPayload(`order:${orderId}:${expiresAt}`);
  return `v2.${orderId}.${expiresAt}.${signature}`;
}

export function verifyOrderAccessToken(
  orderId: number,
  token: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!token?.trim()) return false;
  const trimmed = token.trim();

  if (trimmed.startsWith("v2.")) {
    const parts = trimmed.split(".");
    if (parts.length !== 4) return false;
    const tokenOrderId = parseInt(parts[1] ?? "", 10);
    const expiresAt = parseInt(parts[2] ?? "", 10);
    const signature = parts[3] ?? "";
    if (tokenOrderId !== orderId) return false;
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(nowMs / 1000)) {
      return false;
    }
    const expected = signPayload(`order:${orderId}:${expiresAt}`);
    return timingSafeEqualStrings(signature, expected);
  }

  const expected = createLegacyOrderAccessToken(orderId);
  return timingSafeEqualStrings(trimmed, expected);
}
