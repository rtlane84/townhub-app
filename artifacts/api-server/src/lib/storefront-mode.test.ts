import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptsAppointmentRequests,
  defaultStorefrontModeForBusinessType,
  resolveStorefrontMode,
} from "@workspace/api-zod";

describe("storefront mode", () => {
  it("defaults salons to appointment mode", () => {
    assert.equal(defaultStorefrontModeForBusinessType("SALON"), "APPOINTMENT");
    assert.equal(defaultStorefrontModeForBusinessType("FOOD_VENDOR"), "ORDERING");
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
  });

  it("falls back to type-based default when mode is unset", () => {
    assert.equal(resolveStorefrontMode({ type: "SALON", storefrontMode: null }), "APPOINTMENT");
    assert.equal(resolveStorefrontMode({ type: "GENERAL", storefrontMode: null }), "ORDERING");
  });

  it("accepts appointment requests only in appointment mode", () => {
    assert.equal(acceptsAppointmentRequests({ type: "SALON", storefrontMode: "APPOINTMENT" }), true);
    assert.equal(acceptsAppointmentRequests({ type: "SALON", storefrontMode: "ORDERING" }), false);
    assert.equal(acceptsAppointmentRequests({ type: "SERVICE_PROVIDER", storefrontMode: "APPOINTMENT" }), true);
  });
});
