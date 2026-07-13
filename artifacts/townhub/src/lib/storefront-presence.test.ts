import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  resolveStorefrontPresence,
} from "./storefront-presence.ts";

describe("resolveStorefrontPresence", () => {
  it("classifies mobile businesses before address", () => {
    assert.equal(
      resolveStorefrontPresence({
        address: "123 Main St",
        isMobileBusiness: true,
      }),
      "mobile",
    );
  });

  it("classifies physical businesses with an address", () => {
    assert.equal(
      resolveStorefrontPresence({
        address: "75 Main St, Clay, WV",
        isMobileBusiness: false,
      }),
      "physical",
    );
  });

  it("classifies online when there is no address and not mobile", () => {
    assert.equal(
      resolveStorefrontPresence({
        address: null,
        isMobileBusiness: false,
      }),
      "online",
    );
  });
});

describe("maps urls", () => {
  it("builds search and directions urls from real address text", () => {
    const address = "75 Main St, Clay, WV 25043";
    const encoded = encodeURIComponent(address);
    assert.match(googleMapsSearchUrl(address), /maps\/search/);
    assert.ok(googleMapsSearchUrl(address).includes(encoded));
    assert.match(googleMapsDirectionsUrl(address), /maps\/dir/);
    assert.ok(googleMapsDirectionsUrl(address).includes(encoded));
  });
});
