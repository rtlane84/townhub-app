import type { BusinessLiveEvent } from "./business-live-event-types";

export type ParsedSseEvent = {
  event: string;
  data: string;
};

export function parseSseBuffer(buffer: string): { events: ParsedSseEvent[]; remainder: string } {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";
  const events: ParsedSseEvent[] = [];

  for (const part of parts) {
    if (!part.trim() || part.trimStart().startsWith(":")) continue;

    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length) {
      events.push({ event: eventName, data: dataLines.join("\n") });
    }
  }

  return { events, remainder };
}

export function parseBusinessLiveEvent(parsed: ParsedSseEvent): BusinessLiveEvent | null {
  if (!parsed.data) return null;
  try {
    const data = JSON.parse(parsed.data) as BusinessLiveEvent["data"];
    return {
      type: parsed.event as BusinessLiveEvent["type"],
      data,
    };
  } catch {
    return null;
  }
}

export type LiveEventStreamHandlers = {
  onEvent: (event: BusinessLiveEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
};

export async function connectBusinessLiveEventStream(
  url: string,
  headers: Record<string, string>,
  handlers: LiveEventStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...headers,
    },
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    const error = new Error(`SSE connection failed: HTTP ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  if (!response.body) {
    throw new Error("SSE response body unavailable");
  }

  handlers.onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.remainder;

    for (const chunk of parsed.events) {
      const event = parseBusinessLiveEvent(chunk);
      if (event) {
        handlers.onEvent(event);
      }
    }
  }
}
