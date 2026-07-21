import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("platform branding hero settings", () => {
  it("preserves cover/center defaults and sets overlay/button defaults", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /DEFAULT_HERO_IMAGE_FIT.*= "cover"/);
    assert.match(source, /DEFAULT_HERO_IMAGE_POSITION.*= "center"/);
    assert.match(source, /DEFAULT_HERO_OVERLAY_SIZE.*= "medium"/);
    assert.match(source, /DEFAULT_HERO_OVERLAY_ALIGN.*= "center"/);
    assert.match(source, /DEFAULT_SHOW_SHOP_BUTTON = true/);
    assert.match(source, /DEFAULT_SHOW_LIST_BUSINESS_BUTTON = true/);
    assert.match(source, /DEFAULT_SHOW_HERO_OVERLAY = true/);
    assert.match(source, /DEFAULT_HERO_BUTTON_PLACEMENT[\s\S]*?=\s*"bottom-center"/);
  });

  it("resolves buttons visible unless explicitly disabled (backwards compatible)", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /theme\?\.showShopButton !== false/);
    assert.match(source, /theme\?\.showListBusinessButton !== false/);
    assert.match(source, /theme\?\.showHeroOverlay !== false/);
  });

  it("maps cover vs contain and position to object-fit/position classes", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /fit === "contain" \? "object-contain" : "object-cover"/,
    );
    assert.match(source, /position === "top"[\s\S]*?"object-top"/);
    assert.match(source, /position === "bottom"[\s\S]*?"object-bottom"/);
    assert.match(source, /"object-center"/);
  });

  it("includes the simplified hero fields in the branding payload", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /heroImageUrl: fields\.heroImageUrl\.trim\(\)/);
    assert.match(
      source,
      /heroOverlayImageUrl: fields\.heroOverlayImageUrl\.trim\(\)/,
    );
    assert.match(source, /heroImageFit: fields\.heroImageFit/);
    assert.match(source, /heroImagePosition: fields\.heroImagePosition/);
    assert.match(source, /heroOverlaySize: fields\.heroOverlaySize/);
    assert.match(source, /heroOverlayAlign: fields\.heroOverlayAlign/);
    assert.match(source, /showShopButton: fields\.showShopButton/);
    assert.match(
      source,
      /showListBusinessButton: fields\.showListBusinessButton/,
    );
    assert.match(source, /showHeroOverlay: fields\.showHeroOverlay/);
    assert.match(source, /heroButtonPlacement: fields\.heroButtonPlacement/);
  });

  it("does not reference removed layered-hero fields", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /heroOverlayColor/);
    assert.doesNotMatch(source, /heroOverlayOpacity/);
    assert.doesNotMatch(source, /heroButtonColor/);
    assert.doesNotMatch(source, /heroHeadlineAccentColor/);
    assert.doesNotMatch(source, /heroHeadlineLine/);
    assert.doesNotMatch(source, /showHeroText/);
    assert.doesNotMatch(source, /showHeroButtons/);
  });

  it("expands logo size presets through extra large", async () => {
    const source = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /label: "Small"/);
    assert.match(source, /label: "Medium"/);
    assert.match(source, /label: "Large"/);
    assert.match(source, /label: "Extra large"/);
    assert.match(source, /label: "7X large"/);
    assert.match(source, /value: 192/);
  });

  it("uses friendly admin labels for hero image fit options", async () => {
    const branding = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    assert.match(branding, /label: "Fill banner"/);
    assert.match(branding, /label: "Show full image"/);
    assert.match(adminSettings, /Fill mode may crop on smaller/);
    assert.match(adminSettings, /HERO_IMAGE_FIT_OPTIONS/);
  });
});

describe("homepage discovery configuration", () => {
  it("uses the primary town photo for discovery and removes obsolete admin controls", async () => {
    const homeHero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );

    assert.match(homeHero, /ResponsiveHeroImage/);
    assert.match(homeHero, /resolveTownPhotoSlides/);
    assert.match(homeHero, /resolveTownPhotoSlides\(townPhotos, heroImageUrl\)\[0\]/);
    assert.doesNotMatch(homeHero, /TownPhotoCarousel/);
    assert.match(adminSettings, /TownPhotosEditor/);
    assert.doesNotMatch(adminSettings, /surface="homepage-hero-overlay"/);
    assert.doesNotMatch(adminSettings, /HeroPreviewFrame/);
    assert.doesNotMatch(adminSettings, /label="Shop button"/);
  });

  it("uses the configured object fit and position for the decorative photo", async () => {
    const homeHero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    assert.match(homeHero, /heroImageObjectClasses\(heroImageFit, heroImagePosition\)/);
    assert.doesNotMatch(homeHero, /blur/);
  });

  it("admin keeps only fallback image fit and positioning controls", async () => {
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    assert.match(adminSettings, /TownPhotosEditor/);
    assert.match(adminSettings, /surface="homepage-hero"/);
    assert.match(adminSettings, /HERO_IMAGE_FIT_OPTIONS/);
    assert.match(adminSettings, /HERO_IMAGE_POSITION_OPTIONS/);
    assert.doesNotMatch(adminSettings, /surface="homepage-hero-overlay"/);
    assert.doesNotMatch(adminSettings, /HERO_OVERLAY_SIZE_OPTIONS/);
    assert.doesNotMatch(adminSettings, /HERO_BUTTON_PLACEMENT_OPTIONS/);
  });

  it("applies logo size consistently in admin preview", async () => {
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    const layout = await readFile(
      new URL("../components/layout.tsx", import.meta.url),
      "utf8",
    );
    assert.match(
      adminSettings,
      /width: branding\.logoSizePx,\s*height: branding\.logoSizePx/,
    );
    assert.match(layout, /width: displaySize, height: displaySize/);
    assert.match(layout, /resolveHeaderMinHeightPx/);
    assert.match(layout, /SITE_HEADER_HEIGHT_CSS_VAR/);
    assert.match(layout, /minHeight: headerMinHeightPx/);
    assert.match(layout, /object-contain/);
  });

  it("positions dashboard mobile nav below the dynamic site header", async () => {
    const adminLayout = await readFile(
      new URL("../components/admin-dashboard-layout.tsx", import.meta.url),
      "utf8",
    );
    const businessLayout = await readFile(
      new URL("../components/dashboard-layout.tsx", import.meta.url),
      "utf8",
    );
    const branding = await readFile(
      new URL("./platform-branding.ts", import.meta.url),
      "utf8",
    );
    assert.match(branding, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.match(branding, /DASHBOARD_MOBILE_MAIN_TOP_CLASS/);
    assert.match(adminLayout, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.match(businessLayout, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.doesNotMatch(adminLayout, /top-16/);
    assert.doesNotMatch(businessLayout, /top-16/);
  });
});
