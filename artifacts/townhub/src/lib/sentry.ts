import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/react";
import { sanitizeSentryEventText, sanitizeSentryText } from "./sentry-scrub";

const SENSITIVE_KEY_PATTERN =
  /password|passwd|token|authorization|auth|secret|stripe|api[_-]?key|bearer|cookie|session|cvv|card/i;

const PERFORMANCE_INTEGRATION_NAMES = new Set([
  "BrowserTracing",
  "BrowserProfiling",
  "Replay",
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function scrubValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return "[Redacted]";
  }

  if (typeof value === "string") {
    return sanitizeSentryText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue("item", item));
  }

  if (value && typeof value === "object") {
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

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
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

function scrubEvent(event: ErrorEvent): ErrorEvent {
  sanitizeSentryEventText(event);

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

  if (event.tags) {
    for (const [key, value] of Object.entries(event.tags)) {
      if (isSensitiveKey(key)) {
        event.tags[key] = "[Redacted]";
      } else if (typeof value === "string") {
        event.tags[key] = sanitizeSentryText(value);
      }
    }
  }

  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  return event;
}

function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  return scrubEvent(event);
}

function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  return scrubBreadcrumb(breadcrumb);
}

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

export const sentryEnabled = Boolean(dsn);

if (dsn) {
  const release =
    import.meta.env.VITE_APP_VERSION?.trim() ||
    import.meta.env.VITE_GIT_COMMIT_SHA?.trim() ||
    undefined;

  // Prefer VITE_DEPLOYMENT_ENVIRONMENT (set from DEPLOYMENT_ENVIRONMENT at
  // build time) so staging vs production builds are distinct. Vite MODE is
  // "production" for every `vite build`.
  const environment = (
    import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT?.trim() ||
    import.meta.env.MODE
  ).toLowerCase();

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    integrations: (integrations) =>
      integrations.filter((integration) => !PERFORMANCE_INTEGRATION_NAMES.has(integration.name)),
    beforeSend,
    beforeBreadcrumb,
  });
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export { Sentry };
