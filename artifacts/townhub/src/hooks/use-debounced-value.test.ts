import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("useDebouncedValue", () => {
  it("exports a debounce hook with a 300ms default", async () => {
    const source = await readFile(
      new URL("../hooks/use-debounced-value.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /export function useDebouncedValue/);
    assert.match(source, /delayMs = 300/);
    assert.match(source, /setTimeout/);
    assert.match(source, /clearTimeout/);
  });
});
