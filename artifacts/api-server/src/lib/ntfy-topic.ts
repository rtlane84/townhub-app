import { randomBytes } from "node:crypto";

const MIN_TOPIC_LENGTH = 32;

/** Cryptographically random URL-safe topic (never derived from business name). */
export function generateNtfyTopic(): string {
  // 32 bytes → 43 base64url characters
  const topic = randomBytes(32).toString("base64url");
  if (topic.length < MIN_TOPIC_LENGTH) {
    throw new Error("Generated ntfy topic is too short");
  }
  return topic;
}

export function isValidNtfyTopic(topic: string | null | undefined): boolean {
  if (!topic?.trim()) return false;
  const trimmed = topic.trim();
  if (trimmed.length < MIN_TOPIC_LENGTH) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/** Redact topic for logs (first 4 chars only). */
export function redactNtfyTopic(topic: string): string {
  const trimmed = topic.trim();
  if (trimmed.length <= 4) return "ntfy:****";
  return `ntfy:${trimmed.slice(0, 4)}…`;
}
