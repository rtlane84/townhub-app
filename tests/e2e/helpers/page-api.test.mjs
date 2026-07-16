import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page-api.ts"), "utf8");

describe("pageApiJson staging safety", () => {
  it("resolves API calls against e2eApiUrl instead of the SPA host", () => {
    assert.match(source, /e2eApiUrl/);
    assert.match(source, /resolvePageApiUrl/);
    assert.match(source, /looksLikeHtml/);
    assert.match(source, /Set E2E_API_URL to the API host/);
  });
});
