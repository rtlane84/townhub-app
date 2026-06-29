import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptsAppointmentRequests,
  allowsStorefrontOrdering,
  defaultStorefrontModeForBusinessType,
  hidesStorefrontCart,
  informationPrimaryCtaLabel,
  isInformationStorefrontMode,
  normalizeWebsiteUrl,
  resolveStorefrontMode,
  showsStorefrontCatalog,
} from "@workspace/api-zod";

describe("storefront mode", () => {
  it("defaults salons to appointment mode", () => {
    assert.equal(defaultStorefrontModeForBusinessType("SALON"), "APPOINTMENT");
    assert.equal(defaultStorefrontModeForBusinessType("FOOD_VENDOR"), "ORDERING");
  });

  it("defaults funeral services to information mode", () => {
    assert.equal(defaultStorefrontModeForBusinessType("FUNERAL_SERVICE"), "INFORMATION");
  });

  it("uses explicit storefront mode when set", () => {
    assert.equal(
      resolveStorefrontMode({ type: "SALON", storefrontMode: "ORDERING" }),
      "ORDERING",
    );
    assert.equal(
      resolveStorefrontMode({ type: "RETAIL_STORE", storefrontMode: "APPOINTMENT" }),
      "APPOINTMENT",
    );
    assert.equal(
      resolveStorefrontMode({ type: "GENERAL", storefrontMode: "INFORMATION" }),
      "INFORMATION",
    );
  });

  it("falls back to type-based default when mode is unset", () => {
    assert.equal(resolveStorefrontMode({ type: "SALON", storefrontMode: null }), "APPOINTMENT");
    assert.equal(resolveStorefrontMode({ type: "GENERAL", storefrontMode: null }), "ORDERING");
    assert.equal(resolveStorefrontMode({ type: "FUNERAL_SERVICE", storefrontMode: null }), "INFORMATION");
  });

  it("accepts appointment requests only in appointment mode", () => {
    assert.equal(acceptsAppointmentRequests({ type: "SALON", storefrontMode: "APPOINTMENT" }), true);
    assert.equal(acceptsAppointmentRequests({ type: "SALON", storefrontMode: "ORDERING" }), false);
    assert.equal(acceptsAppointmentRequests({ type: "SERVICE_PROVIDER", storefrontMode: "APPOINTMENT" }), true);
    assert.equal(acceptsAppointmentRequests({ type: "FUNERAL_SERVICE", storefrontMode: "INFORMATION" }), false);
  });

  it("hides cart outside ordering mode", () => {
    assert.equal(hidesStorefrontCart({ type: "GENERAL", storefrontMode: "ORDERING" }), false);
    assert.equal(hidesStorefrontCart({ type: "GENERAL", storefrontMode: "APPOINTMENT" }), true);
    assert.equal(hidesStorefrontCart({ type: "FUNERAL_SERVICE", storefrontMode: "INFORMATION" }), true);
  });

  it("shows catalog for all storefront modes", () => {
    assert.equal(showsStorefrontCatalog("ORDERING"), true);
    assert.equal(showsStorefrontCatalog("APPOINTMENT"), true);
    assert.equal(showsStorefrontCatalog("INFORMATION"), true);
  });

  it("allows online ordering only in ordering mode", () => {
    assert.equal(allowsStorefrontOrdering({ type: "GENERAL", storefrontMode: "ORDERING" }), true);
    assert.equal(allowsStorefrontOrdering({ type: "GENERAL", storefrontMode: "INFORMATION" }), false);
    assert.equal(allowsStorefrontOrdering({ type: "SALON", storefrontMode: "APPOINTMENT" }), false);
  });

  it("uses call-to-order CTA labels for display-only mode", () => {
    assert.equal(informationPrimaryCtaLabel(true), "Call to Order");
    assert.equal(informationPrimaryCtaLabel(false), "Contact Business");
  });

  it("detects information storefront mode", () => {
    assert.equal(isInformationStorefrontMode({ type: "FUNERAL_SERVICE", storefrontMode: "INFORMATION" }), true);
    assert.equal(isInformationStorefrontMode({ type: "GENERAL", storefrontMode: "ORDERING" }), false);
  });

  it("normalizes website URLs", () => {
    assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com");
    assert.equal(normalizeWebsiteUrl("https://example.com"), "https://example.com");
    assert.equal(normalizeWebsiteUrl(""), null);
  });
});
