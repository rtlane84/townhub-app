import { logger } from "./logger";

const SENSITIVE_KEY_PATTERN =
  /(?:password|secret|token|api[_-]?key|authorization|credential|private|service[_-]?role)/i;

const SENSITIVE_VALUE_PATTERN = /^(sk_|pk_|whsec_|eyJ)/;

/** Strip keys and values that must never appear in operational logs. */
export function sanitizeOperationalContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string" && SENSITIVE_VALUE_PATTERN.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export function logOperationalFailure(
  event: string,
  context: Record<string, unknown> = {},
): void {
  const safeContext = sanitizeOperationalContext(context);
  logger.error(
    { operationalEvent: event, ...safeContext },
    `[operational] ${event}`,
  );
}
