import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { buildPublicHealthResponse } from "./lib/system-health";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { createApiRateLimitMiddleware } from "./middlewares/rate-limit";
import { createApiErrorRecorderMiddleware } from "./middlewares/api-error-recorder";
import { shouldTrustProxyForRateLimit } from "./lib/rate-limit-config";

const app: Express = express();

// Dynamic API responses must not be cached — 304 empty bodies break React Query.
app.set("etag", false);

if (shouldTrustProxyForRateLimit()) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Public uptime monitor endpoint — no auth, minimal payload
app.get("/health", (_req, res) => {
  res.json(buildPublicHealthResponse());
});

// Clerk proxy — must be before body parsers
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

// Stripe webhooks require the raw body for signature verification
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
    secretKey: process.env.CLERK_SECRET_KEY,
  })),
);

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api", createApiRateLimitMiddleware());
app.use("/api", createApiErrorRecorderMiddleware());
app.use("/api", router);

export default app;
