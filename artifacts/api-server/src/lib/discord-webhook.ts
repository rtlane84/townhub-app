const DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[\w-]+$/i;

export function isValidDiscordWebhookUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    return DISCORD_WEBHOOK_PATTERN.test(parsed.toString().replace(/\/$/, ""));
  } catch {
    return false;
  }
}

export function normalizeDiscordWebhookUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return isValidDiscordWebhookUrl(trimmed) ? trimmed.replace(/\/$/, "") : null;
}

export type DiscordEmbedField = { name: string; value: string; inline?: boolean };

export async function postDiscordWebhook(input: {
  webhookUrl: string;
  content?: string;
  embeds?: Array<{
    title: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: DiscordEmbedField[];
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidDiscordWebhookUrl(input.webhookUrl)) {
    return { ok: false, error: "Invalid Discord webhook URL" };
  }

  try {
    const response = await fetch(input.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.content,
        embeds: input.embeds,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: text.trim() || `Discord returned ${response.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to reach Discord",
    };
  }
}
