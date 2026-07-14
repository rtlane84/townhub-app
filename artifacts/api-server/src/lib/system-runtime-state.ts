const processStartedAt = new Date().toISOString();

let lastStripeWebhookAt: string | null = null;
let lastStripeWebhookType: string | null = null;
let lastWeatherRefreshAt: string | null = null;
let lastWeatherLocation: string | null = null;

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

export function resetSystemRuntimeStateForTests(): void {
  lastStripeWebhookAt = null;
  lastStripeWebhookType = null;
  lastWeatherRefreshAt = null;
  lastWeatherLocation = null;
}
