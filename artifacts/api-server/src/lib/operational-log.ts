import { logger } from "./logger";
import { recordApiError } from "./system-runtime-state";

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

  const endpoint =
    typeof safeContext.endpoint === "string"
      ? safeContext.endpoint
      : typeof safeContext.scope === "string"
        ? safeContext.scope
        : event;
  const summary =
    typeof safeContext.reason === "string"
      ? safeContext.reason
      : typeof safeContext.message === "string"
        ? safeContext.message
        : event.replace(/_/g, " ");

  recordApiError({
    endpoint,
    httpStatus: typeof safeContext.httpStatus === "number" ? safeContext.httpStatus : 500,
    summary,
    exceptionMessage: summary,
    requestId: typeof safeContext.requestId === "string" ? safeContext.requestId : undefined,
    userId: typeof safeContext.userId === "string" ? safeContext.userId : undefined,
    userLabel: typeof safeContext.userLabel === "string" ? safeContext.userLabel : undefined,
    businessId: typeof safeContext.businessId === "number" ? safeContext.businessId : undefined,
    businessName: typeof safeContext.businessName === "string" ? safeContext.businessName : undefined,
    stackTrace: typeof safeContext.stackTrace === "string" ? safeContext.stackTrace : undefined,
  });
}
