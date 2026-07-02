import type { Request, Response, NextFunction } from "express";
import { recordApiError } from "../lib/system-runtime-state";

export function createApiErrorRecorderMiddleware() {
  return function apiErrorRecorder(req: Request, res: Response, next: NextFunction): void {
    res.on("finish", () => {
      if (res.statusCode < 400) return;
      const path = req.originalUrl?.split("?")[0] ?? req.url?.split("?")[0] ?? "unknown";
      recordApiError({
        endpoint: `${req.method} ${path}`,
        httpStatus: res.statusCode,
        summary: res.statusMessage || `HTTP ${res.statusCode}`,
      });
    });
    next();
  };
}
