/**
 * Sentry must initialize before any other application modules load so the SDK
 * can hook Node's process-level error handlers and HTTP request context.
 *
 * The production start script loads this file with `node --import ./dist/instrument.mjs`
 * before `index.mjs` executes. See artifacts/api-server/package.json "start".
 */
import * as Sentry from "@sentry/node";
import { getDefaultIntegrationsWithoutPerformance } from "@sentry/node";
import type { ErrorEvent, EventHint } from "@sentry/node";

const release =
  process.env.APP_VERSION?.trim() ||
  process.env.GIT_COMMIT_SHA?.trim() ||
  undefined;

const SENSITIVE_KEY_PATTERN =
  /password|passwd|token|authorization|auth|secret|stripe|api[_-]?key|bearer|cookie|session|cvv|card|dsn/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function scrubValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return "[Redacted]";
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return scrubObject(value as Record<string, unknown>);
  }

  return value;
}

function scrubObject(record: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    scrubbed[key] = scrubValue(key, value);
  }
  return scrubbed;
}

function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }

  if (event.contexts) {
    const contexts: Record<string, Record<string, unknown>> = {};
    for (const [name, context] of Object.entries(event.contexts)) {
      contexts[name] = scrubObject(context as Record<string, unknown>);
    }
    event.contexts = contexts;
  }

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }

  if (event.user) {
    // Keep stable id for correlation; drop email/username/PII if present.
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  return event;
}

function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  return scrubEvent(event);
}

function beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (!breadcrumb.data) return breadcrumb;

  const data = { ...breadcrumb.data };
  delete data.body;
  delete data.request_body;
  delete data.response_body;
  delete data.input;

  return {
    ...breadcrumb,
    data: scrubObject(data),
  };
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  release,
  // Error monitoring only — no performance tracing or profiling.
  tracesSampleRate: 0,
  profileSessionSampleRate: 0,
  skipOpenTelemetrySetup: true,
  integrations: getDefaultIntegrationsWithoutPerformance(),
  beforeSend,
  beforeBreadcrumb,
});
