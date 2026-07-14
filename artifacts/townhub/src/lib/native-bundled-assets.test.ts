import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const capacitorConfig = readFileSync(
  new URL("../../capacitor.config.ts", import.meta.url),
  "utf8",
);

describe("native bundled asset configuration", () => {
  it("uses the Vite bundle and never configures a remote server URL", () => {
    assert.match(capacitorConfig, /webDir:\s*"dist\/public"/);
    assert.doesNotMatch(capacitorConfig, /CAPACITOR_SERVER_URL/);
    assert.doesNotMatch(capacitorConfig, /\burl:\s*(?:serverUrl|process\.env)/);
  });

  it("uses the stable Capacitor localhost origin", () => {
    assert.match(capacitorConfig, /hostname:\s*"localhost"/);
    assert.match(capacitorConfig, /scheme:\s*"capacitor"/);
  });
});
