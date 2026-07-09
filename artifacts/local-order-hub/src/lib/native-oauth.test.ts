import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NATIVE_SSO_CALLBACK_URL,
  isNativeSsoCallbackUrl,
  resolveNativeDeepLinkToAppUrl,
} from "./native-oauth.ts";

describe("native-oauth", () => {
  it("builds the townhub SSO callback deep link", () => {
    assert.equal(NATIVE_SSO_CALLBACK_URL, "townhub://sso-callback");
  });

  it("detects SSO callback URLs", () => {
    assert.equal(isNativeSsoCallbackUrl("townhub://sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("townhub://sso-callback?__clerk_status=complete"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/sso-callback"), true);
    assert.equal(isNativeSsoCallbackUrl("https://app.example/businesses"), false);
  });

  it("maps deep links onto the deployed app origin", () => {
    assert.equal(
      resolveNativeDeepLinkToAppUrl(
        "townhub://sso-callback?__clerk_status=complete",
        "https://dynamic-manatee-8e3785.netlify.app",
      ),
      "https://dynamic-manatee-8e3785.netlify.app/sso-callback?__clerk_status=complete",
    );
  });
});
