import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isExternalScheme,
  isStripeCheckoutUrl,
  shouldOpenLinkExternally,
} from "./native-external-links.ts";

describe("native-external-links", () => {
  it("detects external schemes", () => {
    assert.equal(isExternalScheme("mailto:test@example.com"), true);
    assert.equal(isExternalScheme("tel:+15551212"), true);
    assert.equal(isExternalScheme("/help"), false);
  });

  it("detects stripe checkout urls", () => {
    assert.equal(isStripeCheckoutUrl("https://checkout.stripe.com/pay/cs_test"), true);
    assert.equal(isStripeCheckoutUrl("https://example.com/checkout"), false);
  });

  it("opens third-party hosts externally", () => {
    const appHost = "townhub.example.com";
    assert.equal(
      shouldOpenLinkExternally("https://www.google.com/maps/search/?api=1&q=test", appHost),
      true,
    );
    assert.equal(
      shouldOpenLinkExternally("https://facebook.com/page", appHost),
      true,
    );
    assert.equal(
      shouldOpenLinkExternally("https://townhub.example.com/businesses", appHost),
      false,
    );
  });

  it("opens same-host legal pages externally", () => {
    const appHost = "townhub.example.com";
    assert.equal(
      shouldOpenLinkExternally("https://townhub.example.com/privacy-policy", appHost),
      true,
    );
    assert.equal(
      shouldOpenLinkExternally("https://townhub.example.com/terms-of-service", appHost),
      true,
    );
  });
});
