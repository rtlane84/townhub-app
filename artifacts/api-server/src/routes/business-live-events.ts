import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireRole";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  BUSINESS_LIVE_HEARTBEAT_INTERVAL_MS,
  attachLiveEventsBearerFromQuery,
  formatBusinessLiveSseMessage,
  subscribeBusinessLiveEvents,
  type BusinessLiveEvent,
} from "../lib/business-live-events";

const router: IRouter = Router();

function parseBusinessId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// GET /api/businesses/:businessId/live-events — owner/admin SSE stream
router.get(
  "/businesses/:businessId/live-events",
  (req, res, next) => {
    attachLiveEventsBearerFromQuery(req);
    next();
  },
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseBusinessId(req.params.businessId);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const writeEvent = (event: BusinessLiveEvent) => {
      if (res.writableEnded) return;
      res.write(formatBusinessLiveSseMessage(event));
    };

    const writeHeartbeat = () => {
      if (res.writableEnded) return;
      writeEvent({
        type: "heartbeat",
        data: {
          businessId,
          timestamp: new Date().toISOString(),
        },
      });
    };

    writeHeartbeat();

    const unsubscribe = subscribeBusinessLiveEvents(businessId, writeEvent);

    const heartbeatTimer = setInterval(writeHeartbeat, BUSINESS_LIVE_HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    };

    req.on("close", cleanup);
    req.on("aborted", cleanup);
    res.on("close", cleanup);
  },
);

export default router;
