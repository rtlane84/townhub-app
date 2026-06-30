import type { Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";
import {
  isRateLimitDisabled,
  readRateLimitMax,
  readRateLimitWindowMs,
  writeRateLimitMax,
  writeRateLimitWindowMs,
} from "../lib/rate-limit-config";
import {
  isReadLimitedRoute,
  isWriteLimitedRoute,
  RATE_LIMIT_ERROR_MESSAGE,
  shouldSkipRateLimit,
} from "../lib/rate-limit-paths";

type RateLimitKind = "write" | "read";

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
  const writeLimiter = createWriteRateLimiter(writeMax, writeRateLimitWindowMs());
  const readLimiter = createReadRateLimiter(readMax, readRateLimitWindowMs());

  return (req, res, next) => {
    const path = req.path;

    if (shouldSkipRateLimit(path, req.method)) {
      next();
      return;
    }

    if (isWriteLimitedRoute(path, req.method)) {
      writeLimiter(req, res, next);
      return;
    }

    if (isReadLimitedRoute(path, req.method)) {
      readLimiter(req, res, next);
      return;
    }

    next();
  };
}
