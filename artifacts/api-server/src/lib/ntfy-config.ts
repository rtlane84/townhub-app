import { logger } from "./logger";

const DEFAULT_NTFY_SERVER_URL = "https://ntfy.sh";

/** Public ntfy server base URL (no trailing slash). */
export function getNtfyServerUrl(): string {
  const configured = process.env.NTFY_SERVER_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    logger.warn("NTFY_SERVER_URL is not set; using public ntfy.sh");
  }

  return DEFAULT_NTFY_SERVER_URL;
}

/** Subscription URL scanned in the ntfy app or copied manually. */
export function buildNtfySubscriptionUrl(topic: string): string {
  const encoded = encodeURIComponent(topic.trim());
  return `${getNtfyServerUrl()}/${encoded}`;
}
