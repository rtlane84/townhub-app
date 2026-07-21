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
    assert.match(page, /14 day trial/);
    assert.match(page, /const applicationHref = "\/list-your-business"/);
    assert.match(page, /replacement for my POS/);
    assert.match(page, /Receive appointment requests and confirm them/);
    assert.match(page, /Orders you manage/);
    assert.match(page, /Accept pickup and delivery orders when your business is ready/);
    assert.match(page, /lg:grid-cols-5/);
  });

  it("uses the app marketing visual language and a readable final CTA", () => {
    const page = readFileSync(`${srcRoot}/pages/businesses-for-townhub.tsx`, "utf8");
    assert.match(page, /Launching first in Clay, West Virginia/);
    assert.match(page, /Where Clay looks first\./);
    assert.match(page, /text-townhub-blue italic/);
    assert.match(page, /Message us on Facebook/);
    assert.match(page, /https:\/\/www\.facebook\.com\/LaneTechLLC/);
    assert.match(page, /Start your local presence/);
    assert.match(page, /rounded-\[3rem\] border border-gray-100 bg-white/);
    assert.match(page, /bg-\[#fafbfe\] py-24/);
    assert.doesNotMatch(page, /bg-primary py-16 text-primary-foreground/);
  });

  it("wires an unauthenticated public route", () => {
    const app = readFileSync(`${srcRoot}/App.tsx`, "utf8");
    assert.match(app, /const BusinessesForTownHub = lazyWithRetry\(\(\) => import\("@\/pages\/businesses-for-townhub"\)\)/);
    assert.match(app, /<SuspenseRoute path="\/for-businesses" component=\{BusinessesForTownHub\}/);
    assert.match(app, /"\/for-businesses"/);
  });
});
