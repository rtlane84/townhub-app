import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  googleMapsSearchUrl,
  locationDirectionsUrl,
  resolveStorefrontPresence,
} from "./storefront-presence.ts";
import { directionsUrl } from "./directions.ts";

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
  it("builds a Google Maps directions URL outside native iOS", () => {
    const address = "75 Main St, Clay, WV 25043";
    const encoded = encodeURIComponent(address);
    assert.match(googleMapsSearchUrl(address), /maps\/search/);
    assert.ok(googleMapsSearchUrl(address).includes(encoded));
    assert.match(directionsUrl(address, "other"), /maps\/dir/);
    assert.ok(directionsUrl(address, "other").includes(encoded));
  });

  it("builds an Apple Maps directions URL on native iOS", () => {
    const address = "75 Main St, Clay, WV 25043";
    assert.equal(
      directionsUrl(address, "ios"),
      `maps://?daddr=${encodeURIComponent(address)}`,
    );
  });

  it("prefers stop coordinates, then address, then location name", () => {
    assert.equal(
      locationDirectionsUrl(
        {
          latitude: "38.4625",
          longitude: "-81.0821",
          address: "75 Main St, Clay, WV 25043",
          locationName: "Clay Town Square",
        },
        "ios",
      ),
      "maps://?daddr=38.4625%2C-81.0821",
    );
    assert.equal(
      locationDirectionsUrl(
        { address: "75 Main St, Clay, WV 25043", locationName: "Clay Town Square" },
        "other",
      ),
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("75 Main St, Clay, WV 25043")}`,
    );
    assert.equal(
      locationDirectionsUrl({ locationName: "Clay Town Square" }, "other"),
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Clay Town Square")}`,
    );
  });
});
