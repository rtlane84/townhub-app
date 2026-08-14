import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DASHBOARD_MAIN } from "./design-tokens.ts";

describe("dashboard design tokens", () => {
  it("clips horizontal overflow without creating a nested vertical scroller", () => {
    assert.match(DASHBOARD_MAIN, /min-w-0/);
    assert.match(DASHBOARD_MAIN, /overflow-x-clip/);
    assert.doesNotMatch(DASHBOARD_MAIN, /overflow-x-hidden/);
  });
});
