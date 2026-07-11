import type { Request, RequestHandler, Response } from "express";
import { getAuth } from "@clerk/express";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";
import {
  generalRateLimitMax,
  generalRateLimitWindowMs,
  isRateLimitDisabled,
  orderLookupRateLimitMax,
  orderLookupRateLimitWindowMs,
  readRateLimitMax,
  readRateLimitWindowMs,
  writeRateLimitMax,
  writeRateLimitWindowMs,
} from "../lib/rate-limit-config";
import {
  isOrderLookupRoute,
  isOwnerDashboardRoute,
  isReadLimitedRoute,
  isWriteLimitedRoute,
  RATE_LIMIT_ERROR_MESSAGE,
  shouldSkipRateLimit,
} from "../lib/rate-limit-paths";

type RateLimitKind = "write" | "read" | "order_lookup" | "general";

function logRateLimitHit(
  req: Request,
  kind: RateLimitKind,
  max: number,
): void {
  const log = req.log ?? logger;
  log.warn(
    {
      event: "rate_limit_exceeded",
      kind,
      method: req.method,
      path: req.path,
      ip: req.ip,
      limit: max,
    },
    "Rate limit exceeded",
  );
}

function rateLimitHandler(kind: RateLimitKind, max: number) {
  return (_req: Request, res: Response): void => {
    logRateLimitHit(_req, kind, max);
    res.status(429).json({ error: RATE_LIMIT_ERROR_MESSAGE });
  };
}

export function createWriteRateLimiter(
  max = writeRateLimitMax(),
  windowMs = writeRateLimitWindowMs(),
): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler("write", max)(req, res),
  });
}

export function createReadRateLimiter(
  max = readRateLimitMax(),
  windowMs = readRateLimitWindowMs(),
): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler("read", max)(req, res),
  });
}

export function createOrderLookupRateLimiter(
  max = orderLookupRateLimitMax(),
  windowMs = orderLookupRateLimitWindowMs(),
): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler("order_lookup", max)(req, res),
  });
}

export function createGeneralRateLimiter(
  max = generalRateLimitMax(),
  windowMs = generalRateLimitWindowMs(),
): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => rateLimitHandler("general", max)(req, res),
  });
}

/**
 * Applies stricter limits to public write endpoints and lighter limits to
 * expensive public reads. Skips Stripe webhooks entirely.
 */
export function createApiRateLimitMiddleware(): RequestHandler {
  if (isRateLimitDisabled()) {
    return (_req, _res, next) => next();
  }

  const writeMax = writeRateLimitMax();
  const readMax = readRateLimitMax();
  const orderLookupMax = orderLookupRateLimitMax();
  const generalMax = generalRateLimitMax();

  const writeLimiter = createWriteRateLimiter(writeMax, writeRateLimitWindowMs());
  const readLimiter = createReadRateLimiter(readMax, readRateLimitWindowMs());
  const orderLookupLimiter = createOrderLookupRateLimiter(
    orderLookupMax,
    orderLookupRateLimitWindowMs(),
  );
  const generalLimiter = createGeneralRateLimiter(generalMax, generalRateLimitWindowMs());

  return (req, res, next) => {
    const path = req.path;

    if (shouldSkipRateLimit(path, req.method)) {
      next();
      return;
    }

    if (isOwnerDashboardRoute(path, req.method) && getAuth(req).userId) {
      next();
      return;
    }

    if (isWriteLimitedRoute(path, req.method)) {
      writeLimiter(req, res, next);
      return;
    }

    if (isOrderLookupRoute(path, req.method)) {
      orderLookupLimiter(req, res, next);
      return;
    }

    if (isReadLimitedRoute(path, req.method)) {
      readLimiter(req, res, next);
      return;
    }

    generalLimiter(req, res, next);
  };
}
