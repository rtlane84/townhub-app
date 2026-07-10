import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNativeDeepLinkToAppUrl } from "./native-oauth.ts";

/**
 * Mirrors native-push deep-link navigation rules without Capacitor.
 */
function resolvePushDeepLink(raw: string, origin = "https://townhub.example"): string {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value) || value.startsWith("townhub://")) {
    return resolveNativeDeepLinkToAppUrl(value, origin);
  }
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

describe("native push deep links", () => {
  it("opens relative paths inside the app origin", () => {
    assert.equal(
      resolvePushDeepLink("/dashboard/business/orders/9"),
      "https://townhub.example/dashboard/business/orders/9",
    );
  });

  it("resolves custom-scheme deep links", () => {
    assert.equal(
      resolvePushDeepLink("townhub://order/3"),
      "https://townhub.example/order/3",
    );
  });
});
