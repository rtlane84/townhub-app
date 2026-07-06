import { getNtfyServerUrl } from "./ntfy-config";
import { isValidNtfyTopic } from "./ntfy-topic";

export type NtfyPushInput = {
  topic: string;
  title: string;
  message: string;
  click?: string;
  tags?: string[];
};

/** ntfy may reject invalid click URLs; omit rather than fail the whole push. */
export function resolveNtfyClickUrl(click: string | undefined): string | undefined {
  const trimmed = click?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function buildNtfyPublishBody(input: NtfyPushInput): {
  topic: string;
  title: string;
  message: string;
  tags?: string[];
  click?: string;
} {
  const body: {
    topic: string;
    title: string;
    message: string;
    tags?: string[];
    click?: string;
  } = {
    topic: input.topic.trim(),
    title: input.title,
    message: input.message,
  };

  if (input.tags?.length) {
    body.tags = input.tags;
  }

  const click = resolveNtfyClickUrl(input.click);
  if (click) {
    body.click = click;
  }

  return body;
}

export async function postNtfyNotification(
  input: NtfyPushInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidNtfyTopic(input.topic)) {
    return { ok: false, error: "Invalid ntfy topic" };
  }

  const serverUrl = getNtfyServerUrl();
  const body = buildNtfyPublishBody(input);

  try {
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: text.trim() || `ntfy returned ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to reach ntfy server",
    };
  }
}
