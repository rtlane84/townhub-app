import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { recordApiError } from "../lib/system-runtime-state";

function requestIdFrom(req: Request): string | undefined {
  const header = req.headers["x-request-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
  return undefined;
}

export function createApiErrorRecorderMiddleware() {
  return function apiErrorRecorder(req: Request, res: Response, next: NextFunction): void {
    res.on("finish", () => {
      if (res.statusCode < 400) return;
      const path = req.originalUrl?.split("?")[0] ?? req.url?.split("?")[0] ?? "unknown";
      const { userId } = getAuth(req);
      const businessIdRaw = req.params?.businessId ?? req.body?.businessId;
      const businessId =
        typeof businessIdRaw === "string" || typeof businessIdRaw === "number"
          ? Number(businessIdRaw)
          : undefined;

      recordApiError({
        endpoint: `${req.method} ${path}`,
        httpStatus: res.statusCode,
        summary: res.statusMessage || `HTTP ${res.statusCode}`,
        exceptionMessage: res.statusMessage || undefined,
        requestId: requestIdFrom(req),
        userId: userId ?? undefined,
        businessId: Number.isFinite(businessId) ? businessId : undefined,
      });
    });
    next();
  };
}
