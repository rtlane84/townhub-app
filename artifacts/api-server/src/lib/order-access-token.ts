import crypto from "node:crypto";

const DEV_FALLBACK_SECRET = "dev-order-access-token-secret-min-32-chars";

export function getOrderAccessSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required for order access tokens in production");
  }
  return DEV_FALLBACK_SECRET;
}

/** Stateless HMAC token proving access to a guest order confirmation / checkout flow. */
export function createOrderAccessToken(orderId: number): string {
  return crypto
    .createHmac("sha256", getOrderAccessSecret())
    .update(`order:${orderId}`)
    .digest("base64url");
}

export function verifyOrderAccessToken(
  orderId: number,
  token: string | null | undefined,
): boolean {
  if (!token?.trim()) return false;
  const expected = createOrderAccessToken(orderId);
  const provided = token.trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
