import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptsAppointmentRequests,
  allowsStorefrontAppointments,
  allowsStorefrontOrdering,
  defaultStorefrontModeForBusinessType,
  hidesStorefrontCart,
  isBusinessHubNavVisibleForStorefrontMode,
  isInformationStorefrontMode,
  normalizeWebsiteUrl,
  resolveStorefrontMode,
  resolvePublicBrowseMode,
  coerceEntitledStorefrontMode,
  showsStorefrontCatalog,
  storefrontModePublicBadge,
  storefrontCopy,
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

  it("coerces locked modes to display-only without auto-enabling another mode", () => {
    assert.equal(
      coerceEntitledStorefrontMode("ORDERING", {
        onlineOrderingAllowed: false,
        appointmentRequestsAllowed: false,
      }),
      "INFORMATION",
    );
    assert.equal(
      coerceEntitledStorefrontMode("ORDERING", {
        onlineOrderingAllowed: false,
        appointmentRequestsAllowed: true,
      }),
      "INFORMATION",
    );
    assert.equal(
      coerceEntitledStorefrontMode("APPOINTMENT", {
        onlineOrderingAllowed: true,
        appointmentRequestsAllowed: false,
      }),
      "INFORMATION",
    );
    assert.equal(
      coerceEntitledStorefrontMode("ORDERING", {
        onlineOrderingAllowed: true,
        appointmentRequestsAllowed: false,
      }),
      "ORDERING",
    );
    assert.equal(
      coerceEntitledStorefrontMode("INFORMATION", {
        onlineOrderingAllowed: true,
        appointmentRequestsAllowed: true,
      }),
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
    assert.equal(
      hidesStorefrontCart({
        type: "GENERAL",
        storefrontMode: "ORDERING",
        onlineOrderingEntitled: true,
      }),
      false,
    );
    assert.equal(hidesStorefrontCart({ type: "GENERAL", storefrontMode: "APPOINTMENT" }), true);
    assert.equal(hidesStorefrontCart({ type: "FUNERAL_SERVICE", storefrontMode: "INFORMATION" }), true);
  });

  it("hides cart when plan lacks online_ordering even in ORDERING mode", () => {
    assert.equal(
      hidesStorefrontCart({
        type: "GENERAL",
        storefrontMode: "ORDERING",
        onlineOrderingEntitled: false,
      }),
      true,
    );
    assert.equal(
      allowsStorefrontOrdering({
        type: "GENERAL",
        storefrontMode: "ORDERING",
        onlineOrderingEntitled: false,
      }),
      false,
    );
    assert.equal(
      allowsStorefrontOrdering({
        type: "GENERAL",
        storefrontMode: "ORDERING",
        onlineOrderingEntitled: true,
      }),
      true,
    );
  });

  it("requires appointment entitlement even for salon appointment mode", () => {
    const lockedSalon = {
      type: "SALON",
      storefrontMode: "APPOINTMENT" as const,
      onlineOrderingEntitled: false,
      appointmentRequestsEntitled: false,
    };
    assert.equal(allowsStorefrontAppointments(lockedSalon), false);
    assert.equal(resolvePublicBrowseMode(lockedSalon), "INFORMATION");
    assert.equal(
      allowsStorefrontAppointments({
        ...lockedSalon,
        appointmentRequestsEntitled: true,
      }),
      true,
    );
    assert.equal(
      resolvePublicBrowseMode({
        ...lockedSalon,
        appointmentRequestsEntitled: true,
      }),
      "APPOINTMENT",
    );
  });

  it("fails closed when public entitlement fields are missing", () => {
    assert.equal(
      resolvePublicBrowseMode({ type: "GENERAL", storefrontMode: "ORDERING" }),
      "INFORMATION",
    );
    assert.equal(
      resolvePublicBrowseMode({ type: "SALON", storefrontMode: "APPOINTMENT" }),
      "INFORMATION",
    );
  });

  it("shows catalog for all storefront modes when entitled", () => {
    assert.equal(showsStorefrontCatalog("ORDERING"), true);
    assert.equal(showsStorefrontCatalog("APPOINTMENT"), true);
    assert.equal(showsStorefrontCatalog("INFORMATION"), true);
  });

  it("hides catalog when plan lacks business_website", () => {
    assert.equal(
      showsStorefrontCatalog("INFORMATION", { businessWebsiteEntitled: false }),
      false,
    );
    assert.equal(
      showsStorefrontCatalog("ORDERING", { businessWebsiteEntitled: false }),
      false,
    );
    assert.equal(
      showsStorefrontCatalog("ORDERING", { businessWebsiteEntitled: true }),
      true,
    );
  });

  it("allows online ordering only in entitled ordering mode", () => {
    assert.equal(
      allowsStorefrontOrdering({
        type: "GENERAL",
        storefrontMode: "ORDERING",
        onlineOrderingEntitled: true,
      }),
      true,
    );
    assert.equal(allowsStorefrontOrdering({ type: "GENERAL", storefrontMode: "INFORMATION" }), false);
    assert.equal(allowsStorefrontOrdering({ type: "SALON", storefrontMode: "APPOINTMENT" }), false);
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

  it("limits business hub nav by storefront mode", () => {
    const orderingBusiness = { type: "SALON", storefrontMode: "ORDERING" as const };
    assert.equal(
      isBusinessHubNavVisibleForStorefrontMode("/dashboard/business/appointments", orderingBusiness),
      false,
    );
    assert.equal(
      isBusinessHubNavVisibleForStorefrontMode("/dashboard/business/orders", orderingBusiness),
      true,
    );

    const appointmentBusiness = { type: "SERVICE_PROVIDER", storefrontMode: "APPOINTMENT" as const };
    assert.equal(
      isBusinessHubNavVisibleForStorefrontMode("/dashboard/business/appointments", appointmentBusiness),
      true,
    );
    assert.equal(
      isBusinessHubNavVisibleForStorefrontMode("/dashboard/business/kitchen", appointmentBusiness),
      false,
    );
  });

  it("maps public storefront badges to resolved mode", () => {
    assert.deepEqual(storefrontModePublicBadge("ORDERING"), {
      label: "Online Ordering",
      icon: "ordering",
    });
    assert.deepEqual(storefrontModePublicBadge("APPOINTMENT"), {
      label: "Appointments",
      icon: "appointment",
    });
    assert.deepEqual(storefrontModePublicBadge("INFORMATION"), {
      label: "No Online Ordering",
      icon: "information",
    });
  });

  it("uses universal shop copy for all storefront modes", () => {
    assert.equal(storefrontCopy("ORDERING").catalogHeading, "Shop");
    assert.equal(
      storefrontCopy("ORDERING").catalogSubtitle,
      "Browse available items and add them to your cart.",
    );
    assert.equal(
      storefrontCopy("APPOINTMENT").catalogSubtitle,
      "Browse available services and request an appointment.",
    );
    assert.equal(
      storefrontCopy("INFORMATION").catalogSubtitle,
      "Browse available items below. Contact the business directly for more information.",
    );
    assert.equal(
      storefrontCopy("INFORMATION").informationTagline,
      "Contact this business directly for more information.",
    );
    assert.equal(storefrontCopy("ORDERING").emptyTitle, "Nothing has been added yet.");
    assert.match(storefrontCopy("ORDERING").emptyDescription, /current offerings/i);
    assert.equal(storefrontCopy("ORDERING").allItemsLabel, "All Items");
  });
});
