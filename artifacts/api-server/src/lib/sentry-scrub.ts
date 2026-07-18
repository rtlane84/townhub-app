const REDACTED = "[Redacted]";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PROVIDER_IDENTIFIER_PATTERN = /\b(?:dvb|sess|user)_[A-Za-z0-9]+\b/g;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const QUERY_VALUE_PATTERN = /([?&][A-Za-z0-9_.~%-]+=)[^&#\s"'<>)]*/g;
const DATABASE_PARAMS_PATTERN = /(\bparams:\s*)[^\r\n]*/gi;

type TextFields = {
  message?: string;
  formatted?: string;
};

export type SentryTextEvent = {
  message?: string;
  transaction?: string;
  fingerprint?: string[];
  logentry?: TextFields;
  request?: {
    url?: string;
  };
  exception?: {
    values?: Array<{
      value?: string;
      stacktrace?: {
        frames?: Array<{
          filename?: string;
          abs_path?: string;
          module?: string;
        }>;
      };
    }>;
  };
  breadcrumbs?: Array<TextFields>;
};

export function sanitizeSentryText(value: string): string {
  return value
    .replace(DATABASE_PARAMS_PATTERN, `$1${REDACTED}`)
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(QUERY_VALUE_PATTERN, `$1${REDACTED}`)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PROVIDER_IDENTIFIER_PATTERN, REDACTED);
}

function sanitizeTextFields(fields: TextFields | undefined): void {
  if (!fields) return;
  if (fields.message) fields.message = sanitizeSentryText(fields.message);
  if (fields.formatted) fields.formatted = sanitizeSentryText(fields.formatted);
}

export function sanitizeSentryEventText<T extends SentryTextEvent>(event: T): T {
  if (event.message) event.message = sanitizeSentryText(event.message);
  if (event.transaction) event.transaction = sanitizeSentryText(event.transaction);
  if (event.fingerprint) {
    event.fingerprint = event.fingerprint.map(sanitizeSentryText);
  }
  if (event.request?.url) event.request.url = sanitizeSentryText(event.request.url);
  sanitizeTextFields(event.logentry);

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = sanitizeSentryText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = sanitizeSentryText(frame.filename);
      if (frame.abs_path) frame.abs_path = sanitizeSentryText(frame.abs_path);
      if (frame.module) frame.module = sanitizeSentryText(frame.module);
    }
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    sanitizeTextFields(breadcrumb);
  }

  return event;
}
