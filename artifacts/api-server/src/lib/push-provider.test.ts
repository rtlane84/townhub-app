import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isApnsConfigured, resetApnsJwtCache } from "./push/apns-provider.ts";
import { isFcmConfigured } from "./push/fcm-provider.ts";
import { isWebPushConfigured } from "./push/web-push-provider.ts";
import { getPushProviderForPlatform } from "./push/index.ts";

describe("push providers", () => {
  it("uses an HTTP/2 transport for APNs", () => {
    const source = readFileSync(new URL("./push/apns-provider.ts", import.meta.url), "utf8");

    assert.match(source, /from "node:http2"/);
    assert.match(source, /connectHttp2\(/);
    assert.doesNotMatch(source, /await fetch\(/);
  });

  it("resolves platform adapters", () => {
    assert.equal(getPushProviderForPlatform("IOS")?.id, "apns");
    assert.equal(getPushProviderForPlatform("ANDROID")?.id, "fcm");
    assert.equal(getPushProviderForPlatform("WEB")?.id, "web-push");
  });

  it("reports unconfigured when env is unset", () => {
    const prev = {
      APNS_KEY_ID: process.env.APNS_KEY_ID,
      APNS_TEAM_ID: process.env.APNS_TEAM_ID,
      APNS_PRIVATE_KEY: process.env.APNS_PRIVATE_KEY,
      FCM_PROJECT_ID: process.env.FCM_PROJECT_ID,
      WEB_PUSH_VAPID_PUBLIC_KEY: process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
    };
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_PRIVATE_KEY;
    delete process.env.FCM_PROJECT_ID;
    delete process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
    resetApnsJwtCache();

    assert.equal(isApnsConfigured(), false);
    assert.equal(isFcmConfigured(), false);
    assert.equal(isWebPushConfigured(), false);

    if (prev.APNS_KEY_ID !== undefined) process.env.APNS_KEY_ID = prev.APNS_KEY_ID;
    if (prev.APNS_TEAM_ID !== undefined) process.env.APNS_TEAM_ID = prev.APNS_TEAM_ID;
    if (prev.APNS_PRIVATE_KEY !== undefined) process.env.APNS_PRIVATE_KEY = prev.APNS_PRIVATE_KEY;
    if (prev.FCM_PROJECT_ID !== undefined) process.env.FCM_PROJECT_ID = prev.FCM_PROJECT_ID;
    if (prev.WEB_PUSH_VAPID_PUBLIC_KEY !== undefined) {
      process.env.WEB_PUSH_VAPID_PUBLIC_KEY = prev.WEB_PUSH_VAPID_PUBLIC_KEY;
    }
  });

  it("logs IOS sends when APNs is not configured", async () => {
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_PRIVATE_KEY;
    resetApnsJwtCache();

    const provider = getPushProviderForPlatform("IOS");
    assert.ok(provider);
    const results = await provider.send(
      [{ token: "device-token-abc", platform: "IOS", userId: "user_1" }],
      {
        title: "Test",
        body: "Hello",
        deepLink: "/order/1",
      },
    );
    assert.equal(results.length, 1);
    assert.equal(results[0]?.status, "LOGGED");
  });
});
