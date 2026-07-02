export type ApiErrorLogEntry = {
  id: string;
  timestamp: string;
  endpoint: string;
  httpStatus: number;
  summary: string;
  exceptionMessage?: string;
  requestId?: string;
  userId?: string;
  userLabel?: string;
  businessId?: number;
  businessName?: string;
  stackTrace?: string;
};

const MAX_API_ERRORS = 100;
const processStartedAt = new Date().toISOString();

let lastStripeWebhookAt: string | null = null;
let lastStripeWebhookType: string | null = null;
let lastWeatherRefreshAt: string | null = null;
let lastWeatherLocation: string | null = null;
const apiErrors: ApiErrorLogEntry[] = [];
let apiErrorCounter = 0;

export function getProcessStartedAt(): string {
  return processStartedAt;
}

export function recordStripeWebhookReceived(eventType: string, now = new Date()): void {
  lastStripeWebhookAt = now.toISOString();
  lastStripeWebhookType = eventType;
}

export function getLastStripeWebhookReceived(): { at: string; eventType: string } | null {
  if (!lastStripeWebhookAt || !lastStripeWebhookType) return null;
  return { at: lastStripeWebhookAt, eventType: lastStripeWebhookType };
}

export function recordWeatherRefresh(location: string, now = new Date()): void {
  lastWeatherRefreshAt = now.toISOString();
  lastWeatherLocation = location;
}

export function getLastWeatherRefresh(): { at: string; location: string } | null {
  if (!lastWeatherRefreshAt) return null;
  return { at: lastWeatherRefreshAt, location: lastWeatherLocation ?? "" };
}

export function recordApiError(input: {
  endpoint: string;
  httpStatus: number;
  summary: string;
  exceptionMessage?: string;
  requestId?: string;
  userId?: string;
  userLabel?: string;
  businessId?: number;
  businessName?: string;
  stackTrace?: string;
  now?: Date;
}): void {
  const isProduction = process.env.NODE_ENV === "production";
  const entry: ApiErrorLogEntry = {
    id: `err_${++apiErrorCounter}`,
    timestamp: (input.now ?? new Date()).toISOString(),
    endpoint: input.endpoint,
    httpStatus: input.httpStatus,
    summary: input.summary.slice(0, 500),
    ...(input.exceptionMessage ? { exceptionMessage: input.exceptionMessage.slice(0, 1000) } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.userLabel ? { userLabel: input.userLabel } : {}),
    ...(input.businessId != null ? { businessId: input.businessId } : {}),
    ...(input.businessName ? { businessName: input.businessName } : {}),
    ...(!isProduction && input.stackTrace ? { stackTrace: input.stackTrace.slice(0, 4000) } : {}),
  };
  apiErrors.unshift(entry);
  if (apiErrors.length > MAX_API_ERRORS) {
    apiErrors.length = MAX_API_ERRORS;
  }
}

export function listApiErrors(limit = 50): ApiErrorLogEntry[] {
  return apiErrors.slice(0, Math.min(limit, MAX_API_ERRORS));
}

export function countApiErrorsSince(since: Date): number {
  const sinceMs = since.getTime();
  return apiErrors.filter((entry) => new Date(entry.timestamp).getTime() >= sinceMs).length;
}

export function resetSystemRuntimeStateForTests(): void {
  lastStripeWebhookAt = null;
  lastStripeWebhookType = null;
  lastWeatherRefreshAt = null;
  lastWeatherLocation = null;
  apiErrors.length = 0;
  apiErrorCounter = 0;
}
