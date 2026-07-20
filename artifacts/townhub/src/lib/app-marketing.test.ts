import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { appMarketingConfig } from "./app-marketing-config.ts";
import { isAppMarketingPath } from "./app-marketing-meta.ts";

const srcRoot = fileURLToPath(new URL("..", import.meta.url));

describe("app marketing page", () => {
  it("exposes store and support settings in one config module", () => {
    assert.equal(typeof appMarketingConfig.appStoreUrl, "string");
    assert.match(appMarketingConfig.appStoreUrl, /PLACEHOLDER|apps\.apple\.com/);
    assert.equal(typeof appMarketingConfig.appStoreId, "string");
    assert.ok(appMarketingConfig.appStoreId.length > 0);
    assert.equal(appMarketingConfig.businessSignupUrl, "/list-your-business");
    assert.equal(typeof appMarketingConfig.supportEmail, "string");
    assert.equal(appMarketingConfig.androidAvailable, false);
    assert.match(appMarketingConfig.pageTitle, /TownHub/);
    assert.ok(appMarketingConfig.metaDescription.length > 40);
  });

  it("recognizes the public /app marketing path", () => {
    assert.equal(isAppMarketingPath("/app"), true);
    assert.equal(isAppMarketingPath("/app/"), true);
    assert.equal(isAppMarketingPath("/app?ref=home"), true);
    assert.equal(isAppMarketingPath("/"), false);
    assert.equal(isAppMarketingPath("/apple"), false);
    assert.equal(isAppMarketingPath("/businesses"), false);
  });

  it("wires a public unauthenticated /app route", () => {
    const appSource = readFileSync(`${srcRoot}/App.tsx`, "utf8");
    assert.match(
      appSource,
      /const AppMarketing = lazyWithRetry\(\(\) => import\("@\/pages\/app-marketing"\)\)/,
    );
    assert.match(appSource, /<SuspenseRoute path="\/app" component=\{AppMarketing\}/);
    assert.doesNotMatch(appSource, /ProtectedRoute path="\/app"/);
  });

  it("skips marketplace chrome for the marketing page", () => {
    const layoutSource = readFileSync(`${srcRoot}/components/layout.tsx`, "utf8");
    assert.match(layoutSource, /isAppMarketingPath/);
    assert.match(layoutSource, /return <>\{children\}<\/>/);
  });

  it("keeps Android as Coming Soon and does not navigate", () => {
    const storeButtons = readFileSync(
      `${srcRoot}/components/app-marketing/store-buttons.tsx`,
      "utf8",
    );
    assert.match(storeButtons, /Coming Soon/);
    assert.match(storeButtons, /disabled/);
    assert.match(storeButtons, /androidAvailable/);
    assert.doesNotMatch(storeButtons, /play\.google\.com/);
  });

  it("loads marketing screenshots from production assets, not the Replit folder", () => {
    const pageSource = readFileSync(`${srcRoot}/pages/app-marketing.tsx`, "utf8");
    const heroSource = readFileSync(`${srcRoot}/components/app-marketing/hero.tsx`, "utf8");
    assert.doesNotMatch(pageSource, /_replit-app-page/);
    assert.doesNotMatch(heroSource, /_replit-app-page/);
    assert.match(heroSource, /@\/assets\/app-marketing\//);
    assert.match(heroSource, /loading="eager"/);
  });

  it("lazy-loads below-the-fold phone frames by default", () => {
    const phoneFrame = readFileSync(
      `${srcRoot}/components/app-marketing/phone-frame.tsx`,
      "utf8",
    );
    assert.match(phoneFrame, /loading = "lazy"/);
    assert.match(phoneFrame, /aspectRatio/);
    assert.match(phoneFrame, /object-cover/);
    // Replit-style border bezel + proportional attached CSS notch (no SVG / no fixed h-5).
    assert.match(phoneFrame, /border-\[6px\]/);
    assert.match(phoneFrame, /rounded-b-3xl/);
    assert.match(phoneFrame, /width: "33\.333%"/);
    // Corner radius scales with width so small dual phones match the good large-frame silhouette.
    assert.match(phoneFrame, /rounded-\[min\(2\.5rem,14%\)\]/);
    assert.doesNotMatch(phoneFrame, /viewBox=/);
    assert.doesNotMatch(phoneFrame, /\bh-5\b|\bh-6\b/);
  });

  it("sets Apple Smart App Banner metadata from config", () => {
    const metaSource = readFileSync(`${srcRoot}/lib/app-marketing-meta.ts`, "utf8");
    assert.match(metaSource, /apple-itunes-app/);
    assert.match(metaSource, /app-id=\$\{appStoreId\}/);
    assert.match(metaSource, /og:title/);
    assert.match(metaSource, /og:description/);
  });
});
