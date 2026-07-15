import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Mirror of custom-fetch infer/parse behavior for missing Content-Type /
 * text/* JSON bodies. Kept as a unit test of the regressions that crashed
 * native home Spotlight (string.map is not a function).
 */

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function inferResponseType(mediaType: string | null): "json" | "text" | "blob" {
  if (mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"))) {
    return "json";
  }
  if (mediaType == null) return "json";
  if (
    mediaType.startsWith("text/") ||
    mediaType === "application/xml" ||
    mediaType === "text/xml" ||
    mediaType.endsWith("+xml") ||
    mediaType === "application/x-www-form-urlencoded"
  ) {
    return "text";
  }
  return "blob";
}

function parseTextBody(text: string): unknown {
  if (text === "") return null;
  if (looksLikeJson(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

describe("custom-fetch JSON-first response handling", () => {
  it("treats missing Content-Type as JSON", () => {
    assert.equal(inferResponseType(null), "json");
  });

  it("parses JSON arrays returned as text/* bodies", () => {
    const parsed = parseTextBody(
      '[{"id":1,"title":"Test","buttonText":"Go","buttonUrl":"/"}]',
    );
    assert.ok(Array.isArray(parsed));
    assert.equal((parsed as Array<{ id: number }>)[0].id, 1);
  });

  it("leaves non-JSON text alone", () => {
    assert.equal(parseTextBody("ok"), "ok");
  });
});
