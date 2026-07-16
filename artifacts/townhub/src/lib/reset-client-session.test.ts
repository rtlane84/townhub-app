import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  resolveAuthTokenWithTimeout,
} from "../../../../lib/api-client-react/src/custom-fetch.ts";

const resetSource = readFileSync(
  new URL("./reset-client-session.ts", import.meta.url),
  "utf8",
);
const tabBarSource = readFileSync(
  new URL("../components/native-bottom-tab-bar.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../App.tsx", import.meta.url),
  "utf8",
);
const splashSource = readFileSync(
  new URL("../components/animated-splash.tsx", import.meta.url),
  "utf8",
);
const brandingSource = readFileSync(
  new URL("./platform-branding.ts", import.meta.url),
  "utf8",
);
const themeProviderSource = readFileSync(
  new URL("../components/theme-provider.tsx", import.meta.url),
  "utf8",
);

describe("resetClientSessionState ordering", () => {
  it("clears the bearer getter before wiping the query cache", () => {
    const getterIdx = resetSource.indexOf("setAuthTokenGetter(null)");
    const clearIdx = resetSource.indexOf("queryClient.clear()");
    assert.ok(getterIdx >= 0, "expected setAuthTokenGetter(null)");
    assert.ok(clearIdx >= 0, "expected queryClient.clear()");
    assert.ok(getterIdx < clearIdx, "token getter must clear before cache clear");
  });

  it("restores platform theme after clear", () => {
    assert.match(resetSource, /setQueryData\(themeKey,\s*theme\)/);
    assert.match(resetSource, /writeCachedPlatformTheme\(theme\)/);
  });

  it("wires the Clerk listener to resetClientSessionState", () => {
    assert.match(appSource, /resetClientSessionState\(queryClient\)/);
  });

  it("does not double-clear from the native Account sign-out path", () => {
    assert.match(tabBarSource, /setAuthTokenGetter\(null\)/);
    assert.doesNotMatch(tabBarSource, /queryClient\.clear\(/);
  });
});

describe("resolveAuthTokenWithTimeout", () => {
  it("returns sync tokens immediately", async () => {
    assert.equal(await resolveAuthTokenWithTimeout(() => "tok"), "tok");
    assert.equal(await resolveAuthTokenWithTimeout(() => null), null);
  });

  it("returns null when the getter hangs past the timeout", async () => {
    const start = Date.now();
    const token = await resolveAuthTokenWithTimeout(
      () => new Promise(() => {}),
      40,
    );
    assert.equal(token, null);
    assert.ok(Date.now() - start < 500, "should not wait forever");
  });

  it("returns null when the getter rejects", async () => {
    assert.equal(
      await resolveAuthTokenWithTimeout(() => Promise.reject(new Error("gone"))),
      null,
    );
  });
});

describe("platform branding defaults and splash hold", () => {
  it("defaults platform name to TownHub not LocalOrderHub", () => {
    assert.match(brandingSource, /DEFAULT_PLATFORM_NAME\s*=\s*"TownHub"/);
    assert.doesNotMatch(brandingSource, /LocalOrderHub/);
  });

  it("hydrates theme provider from device cache", () => {
    assert.match(themeProviderSource, /readCachedPlatformTheme/);
    assert.match(themeProviderSource, /initialData:\s*cachedTheme/);
    assert.match(themeProviderSource, /writeCachedPlatformTheme\(theme\)/);
  });

  it("holds native splash until theme ready with a safety cap", () => {
    assert.match(splashSource, /themeLoading/);
    assert.match(splashSource, /SPLASH_THEME_SAFETY_MS/);
    assert.match(splashSource, /minHoldElapsed\s*&&\s*!themeLoading/);
  });

  it("uses a short, subtle native splash transition", () => {
    assert.match(splashSource, /SPLASH_HOLD_MS\s*=\s*1200/);
    assert.match(splashSource, /scale:\s*0\.94/);
    assert.doesNotMatch(splashSource, /rotate:\s*360/);
  });
});
