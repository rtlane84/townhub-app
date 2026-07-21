import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));

describe("business sales page", () => {
  it("publishes the Clay offer and applies to the existing public flow", () => {
    const page = readFileSync(`${srcRoot}/pages/businesses-for-townhub.tsx`, "utf8");
    assert.match(page, /Business Showcase/);
    assert.match(page, /\$20/);
    assert.match(page, /\$200/);
    assert.match(page, /Business Ordering/);
    assert.match(page, /\$40/);
    assert.match(page, /\$400/);
    assert.match(page, /14-day trial/);
    assert.match(page, /const applicationHref = "\/list-your-business"/);
    assert.match(page, /replacement for my POS/);
    assert.match(page, /Receive appointment requests and confirm them/);
  });

  it("wires an unauthenticated public route", () => {
    const app = readFileSync(`${srcRoot}/App.tsx`, "utf8");
    assert.match(app, /const BusinessesForTownHub = lazyWithRetry\(\(\) => import\("@\/pages\/businesses-for-townhub"\)\)/);
    assert.match(app, /<SuspenseRoute path="\/for-businesses" component=\{BusinessesForTownHub\}/);
    assert.match(app, /"\/for-businesses"/);
  });
});
