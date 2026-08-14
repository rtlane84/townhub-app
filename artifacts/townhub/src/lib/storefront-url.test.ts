import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPublicStorefrontDisplayUrl,
  buildPublicStorefrontUrl,
  resolvePublicStorefrontOrigin,
} from "./storefront-url.ts";

describe("resolvePublicStorefrontOrigin", () => {
  it("prefers configured HTTPS public web URL over capacitor origin", () => {
    assert.equal(
      resolvePublicStorefrontOrigin(
        "capacitor://localhost",
        "https://townhaven.io/",
      ),
      "https://townhaven.io",
    );
  });

  it("uses ordinary browser http(s) origin when public web URL is unset", () => {
    assert.equal(
      resolvePublicStorefrontOrigin("http://localhost:23032", null),
      "http://localhost:23032",
    );
    assert.equal(
      resolvePublicStorefrontOrigin("https://staging.townhaven.io", null),
      "https://staging.townhaven.io",
    );
  });

  it("returns null for capacitor origin without a configured HTTPS base", () => {
    assert.equal(
      resolvePublicStorefrontOrigin("capacitor://localhost", null),
      null,
    );
  });
});

describe("buildPublicStorefrontUrl", () => {
  it("builds an HTTPS storefront URL from the public web base on native", () => {
    assert.equal(
      buildPublicStorefrontUrl("clay-diner", {
        runtimeOrigin: "capacitor://localhost",
        publicWebBaseUrl: "https://townhaven.io",
      }),
      "https://townhaven.io/businesses/clay-diner",
    );
  });

  it("builds display host+path without protocol", () => {
    assert.equal(
      buildPublicStorefrontDisplayUrl("clay-diner", {
        runtimeOrigin: "capacitor://localhost",
        publicWebBaseUrl: "https://townhaven.io",
      }),
      "townhaven.io/businesses/clay-diner",
    );
  });
});
