/**
 * Sentry must initialize before any other application modules load so the SDK
 * can hook Node's process-level error handlers and HTTP request context.
 *
 * The production start script loads this file with `node --import ./dist/instrument.mjs`
 * before `index.mjs` executes. See artifacts/api-server/package.json "start".
 */
import * as Sentry from "@sentry/node";
import { getDefaultIntegrationsWithoutPerformance } from "@sentry/node";

const release =
  process.env.APP_VERSION?.trim() ||
  process.env.GIT_COMMIT_SHA?.trim() ||
  undefined;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  release,
  // Error monitoring only — no performance tracing or profiling.
  tracesSampleRate: 0,
  profileSessionSampleRate: 0,
  skipOpenTelemetrySetup: true,
  integrations: getDefaultIntegrationsWithoutPerformance(),
});
