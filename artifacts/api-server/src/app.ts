import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import * as Sentry from "@sentry/node";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { buildPublicHealthResponse } from "./lib/system-health";
import { createCorsOptions } from "./lib/cors-config";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { createApiRateLimitMiddleware } from "./middlewares/rate-limit";
import { shouldTrustProxyForRateLimit } from "./lib/rate-limit-config";
import { getFrontendBaseUrl } from "./lib/app-base-url";
import { buildNativeCheckoutReturnHtml } from "./lib/native-checkout-return-html";

const app: Express = express();

// Dynamic API responses must not be cached — 304 empty bodies break React Query.
app.set("etag", false);

if (shouldTrustProxyForRateLimit()) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    // Uptime monitors and load probes hit /health constantly; logging every 200
    // floods Railway (and Locomotive → Better Stack) until messages are dropped.
    // Keep failures and all non-health traffic visible.
    autoLogging: {
      ignore: (req) => {
        const url = req.url?.split("?")[0] ?? "";
        return url === "/health" || url === "/health/";
      },
    },
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

/**
 * Stripe Checkout success/cancel lands here when APP_BASE_URL is the API host.
 * Bounce into the Capacitor app (townhub://) or the real frontend origin.
 */
app.get(["/native-checkout-return", "/native-checkout-return/"], (_req, res) => {
  res
    .status(200)
    .type("html")
    .set("Cache-Control", "no-store")
    .send(buildNativeCheckoutReturnHtml(getFrontendBaseUrl()));
});

// Clerk proxy — must be before body parsers
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors(createCorsOptions()));

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
app.use("/api", router);

// Sentry Express error handler must be registered after all routes/controllers
// and before any other error-handling middleware. Request context for errors is
// established by the Http integration during Sentry.init() in instrument.ts.
Sentry.setupExpressErrorHandler(app);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  logger.error({ err, method: req.method, url: req.originalUrl }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
