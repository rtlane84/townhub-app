import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NATIVE_BUNDLED_ORIGIN,
  NATIVE_SSO_DEEP_LINK,
  NATIVE_SSO_HTTPS_BOUNCE_PATH,
  buildNativeSsoCapacitorCallbackUrl,
  buildNativeSsoDeepLinkFromLocation,
  getNativeBundledOrigin,
  getNativeSsoHttpsCallbackUrl,
  isNativeSsoCallbackUrl,
  nativeSsoDeepLinkHasParams,
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
    assert.equal(NATIVE_SSO_DEEP_LINK, "townhub://oauth/sso-callback");
  });

  it("detects SSO callback URLs", () => {
    assert.equal(isNativeSsoCallbackUrl("townhub://oauth/sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("townhub://oauth/sso-callback?__clerk_status=complete"), true);
    assert.equal(
      isNativeSsoCallbackUrl("townhub://oauth/sso-callback/p/%3Frotating_token_nonce%3Dabc"),
      true,
    );
    assert.equal(isNativeSsoCallbackUrl("townhub://sso-callback/p/%3Frotating_token_nonce%3Dabc"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/native-sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/businesses"), false);
  });

  it("builds capacitor:// callback with Clerk query intact", () => {
    assert.equal(
      buildNativeSsoCapacitorCallbackUrl("?rotating_token_nonce=abc"),
      "capacitor://localhost/sso-callback?rotating_token_nonce=abc",
    );
  });

  it("path-encodes Clerk params under townhub://oauth so Cap cannot strip them", () => {
    assert.equal(
      buildNativeSsoDeepLinkFromLocation("?__clerk_status=complete&rotating_token_nonce=abc"),
      "townhub://oauth/sso-callback/p/" +
        encodeURIComponent("?__clerk_status=complete&rotating_token_nonce=abc"),
    );
    assert.equal(nativeSsoDeepLinkHasParams("townhub://oauth/sso-callback"), false);
    assert.equal(
      nativeSsoDeepLinkHasParams(
        "townhub://oauth/sso-callback/p/" + encodeURIComponent("?rotating_token_nonce=abc"),
      ),
      true,
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

  it("always remounts onto the bundled Capacitor origin", () => {
    assert.equal(NATIVE_BUNDLED_ORIGIN, "capacitor://localhost");
    assert.equal(getNativeBundledOrigin("https://staging.townhub.example"), "capacitor://localhost");
    assert.equal(getNativeBundledOrigin("capacitor://localhost"), "capacitor://localhost");
  });

  it("maps deep links onto the bundled app origin", () => {
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "townhub://oauth/sso-callback?__clerk_status=complete",
        "https://staging.townhub.example",
      ),
      "capacitor://localhost/sso-callback?__clerk_status=complete",
    );
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "townhub://oauth/sso-callback/p/" +
          encodeURIComponent("?rotating_token_nonce=abc&__clerk_status=complete"),
        "capacitor://localhost",
      ),
      "capacitor://localhost/sso-callback?rotating_token_nonce=abc&__clerk_status=complete",
    );
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "townhub://sso-callback/p/" +
          encodeURIComponent("?rotating_token_nonce=abc&__clerk_status=complete"),
        "capacitor://localhost",
      ),
      "capacitor://localhost/sso-callback?rotating_token_nonce=abc&__clerk_status=complete",
    );
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "https://staging.townhub.example/native-sso-callback?rotating_token_nonce=abc",
        "https://staging.townhub.example",
      ),
      "capacitor://localhost/sso-callback?rotating_token_nonce=abc",
    );
  });
});
