import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import * as Sentry from "@sentry/node";

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number.parseInt(value, 10);
    return n > 0 ? n : null;
  }
  return null;
}

/** Numeric business id from `businessId` param or JSON body only — never PII. */
export function extractBusinessIdFromRequest(req: Request): number | null {
  const fromParam = parsePositiveInt(req.params?.businessId);
  if (fromParam != null) return fromParam;

  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return parsePositiveInt((body as Record<string, unknown>).businessId);
  }

  return null;
}

/**
 * Attaches safe request context to the current Sentry isolation scope and
 * enriches the request logger for Better Stack Logs correlation.
 */
export function sentryRequestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const requestId = typeof req.id === "string" && req.id.length > 0 ? req.id : randomUUID();
  req.id = requestId;

  const { userId } = getAuth(req);
  const businessId = extractBusinessIdFromRequest(req);
  const routePath = req.route?.path
    ? `${req.baseUrl}${req.route.path}`
    : (req.originalUrl ?? req.url).split("?")[0];

  const scope = Sentry.getCurrentScope();
  scope.setTag("request_id", requestId);
  scope.setTag("http.method", req.method);
  scope.setTag("route", routePath);

  if (userId) {
    scope.setUser({ id: userId });
  } else {
    scope.setUser(null);
  }

  if (businessId != null) {
    scope.setTag("business_id", String(businessId));
  }

  if (req.log) {
    req.log = req.log.child({
      requestId,
      ...(userId ? { userId } : {}),
      ...(businessId != null ? { businessId } : {}),
    });
  }

  next();
}
