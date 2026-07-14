import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NATIVE_SSO_DEEP_LINK,
  NATIVE_SSO_HTTPS_BOUNCE_PATH,
  buildNativeSsoDeepLinkFromLocation,
  getNativeSsoHttpsCallbackUrl,
  isNativeSsoCallbackUrl,
  resolvePublicWebBaseUrl,
  resolveNativeDeepLinkToAppUrl,
} from "./native-oauth.ts";

describe("native-oauth", () => {
  it("builds HTTPS bounce URL Clerk accepts and townhub deep link for app return", () => {
    assert.equal(NATIVE_SSO_HTTPS_BOUNCE_PATH, "/native-sso-callback");
    assert.equal(
      getNativeSsoHttpsCallbackUrl("https://staging.townhub.example"),
      "https://staging.townhub.example/native-sso-callback",
    );
    assert.equal(NATIVE_SSO_DEEP_LINK, "townhub://sso-callback");
  });

  it("detects SSO callback URLs", () => {
    assert.equal(isNativeSsoCallbackUrl("townhub://sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("townhub://sso-callback?__clerk_status=complete"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/native-sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/businesses"), false);
  });

  it("builds deep link bounce with Clerk query params", () => {
    assert.equal(
      buildNativeSsoDeepLinkFromLocation("?__clerk_status=complete&rotating_token_nonce=abc"),
      "townhub://sso-callback?__clerk_status=complete&rotating_token_nonce=abc",
    );
  });

  it("requires an HTTPS public web URL for native OAuth", () => {
    assert.equal(
      resolvePublicWebBaseUrl("https://app.townhub.example/", "capacitor://localhost"),
      "https://app.townhub.example",
    );
    assert.throws(
      () => resolvePublicWebBaseUrl(undefined, "capacitor://localhost"),
      /VITE_PUBLIC_WEB_URL/,
    );
  });

  it("maps deep links onto the bundled app origin", () => {
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "townhub://sso-callback?__clerk_status=complete",
        "capacitor://localhost",
      ),
      "capacitor://localhost/sso-callback?__clerk_status=complete",
    );
  });
});
