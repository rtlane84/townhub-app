import type { Request, Response, NextFunction } from "express";

export function requireJobSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.JOB_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "Background jobs are not configured (JOB_SECRET missing)" });
    return;
  }

  const authHeader = req.headers.authorization?.trim();
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const headerSecret = typeof req.headers["x-job-secret"] === "string" ? req.headers["x-job-secret"].trim() : null;
  const provided = bearer || headerSecret;

  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
