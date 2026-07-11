import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("platform branding hero settings", () => {
  it("preserves cover/center defaults and sets overlay/button defaults", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /DEFAULT_HERO_IMAGE_FIT.*= "cover"/);
    assert.match(source, /DEFAULT_HERO_IMAGE_POSITION.*= "center"/);
    assert.match(source, /DEFAULT_HERO_OVERLAY_SIZE.*= "medium"/);
    assert.match(source, /DEFAULT_HERO_OVERLAY_ALIGN.*= "center"/);
    assert.match(source, /DEFAULT_SHOW_SHOP_BUTTON = true/);
    assert.match(source, /DEFAULT_SHOW_LIST_BUSINESS_BUTTON = true/);
    assert.match(source, /DEFAULT_HERO_BUTTON_PLACEMENT.*= "bottom-center"/);
  });

  it("resolves buttons visible unless explicitly disabled (backwards compatible)", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /theme\?\.showShopButton !== false/);
    assert.match(source, /theme\?\.showListBusinessButton !== false/);
  });

  it("maps cover vs contain and position to object-fit/position classes", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /fit === "contain" \? "object-contain" : "object-cover"/);
    assert.match(source, /position === "top" \? "object-top"/);
    assert.match(source, /position === "bottom" \? "object-bottom" : "object-center"/);
  });

  it("includes the simplified hero fields in the branding payload", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /heroImageUrl: fields\.heroImageUrl\.trim\(\)/);
    assert.match(source, /heroOverlayImageUrl: fields\.heroOverlayImageUrl\.trim\(\)/);
    assert.match(source, /heroImageFit: fields\.heroImageFit/);
    assert.match(source, /heroImagePosition: fields\.heroImagePosition/);
    assert.match(source, /heroOverlaySize: fields\.heroOverlaySize/);
    assert.match(source, /heroOverlayAlign: fields\.heroOverlayAlign/);
    assert.match(source, /showShopButton: fields\.showShopButton/);
    assert.match(source, /showListBusinessButton: fields\.showListBusinessButton/);
    assert.match(source, /heroButtonPlacement: fields\.heroButtonPlacement/);
  });

  it("does not reference removed layered-hero fields", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /heroOverlayColor/);
    assert.doesNotMatch(source, /heroOverlayOpacity/);
    assert.doesNotMatch(source, /heroButtonColor/);
    assert.doesNotMatch(source, /heroHeadlineAccentColor/);
    assert.doesNotMatch(source, /heroHeadlineLine/);
    assert.doesNotMatch(source, /showHeroText/);
    assert.doesNotMatch(source, /showHeroButtons/);
  });

  it("expands logo size presets through extra large", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /label: "Small"/);
    assert.match(source, /label: "Medium"/);
    assert.match(source, /label: "Large"/);
    assert.match(source, /label: "Extra large"/);
    assert.match(source, /label: "7X large"/);
    assert.match(source, /value: 192/);
  });

  it("uses friendly admin labels for hero image fit options", async () => {
    const branding = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    assert.match(branding, /label: "Fill banner"/);
    assert.match(branding, /label: "Show full image"/);
    assert.match(adminSettings, /Fill banner can still crop depending on screen size/);
    assert.match(adminSettings, /HERO_IMAGE_FIT_OPTIONS/);
  });
});

describe("hero composition parity between live homepage and admin preview", () => {
  it("live hero and admin preview both render the shared HeroStage", async () => {
    const homeHero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    const previewFrame = await readFile(
      new URL("../components/hero-preview-frame.tsx", import.meta.url),
      "utf8",
    );
    const stage = await readFile(new URL("../components/hero-stage.tsx", import.meta.url), "utf8");

    assert.match(homeHero, /HeroStage/);
    assert.match(previewFrame, /HeroStage/);
    assert.match(stage, /HERO_SECTION_MIN_HEIGHT_CLASS/);
    assert.match(stage, /HeroImageLayers/);
  });

  it("shares the same min-height on live hero and admin preview", async () => {
    const branding = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(branding, /min-h-\[176px\] md:min-h-\[340px\]/);
  });

  it("never crops the overlay image (object-contain) and scales it responsively", async () => {
    const stage = await readFile(new URL("../components/hero-stage.tsx", import.meta.url), "utf8");
    const branding = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(stage, /object-contain/);
    assert.match(stage, /heroOverlaySizeClasses/);
    assert.match(branding, /max-w-\[70%\] md:max-w-\[38%\]/);
    assert.match(branding, /max-w-\[85%\] md:max-w-\[55%\]/);
    assert.match(branding, /max-w-\[92%\] md:max-w-\[72%\]/);
  });

  it("background image uses object-fit/position and has no blur", async () => {
    const layers = await readFile(
      new URL("../components/hero-image-layers.tsx", import.meta.url),
      "utf8",
    );
    assert.match(layers, /heroImageObjectClasses/);
    assert.doesNotMatch(layers, /blur/);
    assert.match(layers, /from-primary\/10 via-background to-muted\/40/);
  });

  it("admin exposes the simplified hero controls only", async () => {
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    assert.match(adminSettings, /HeroPreviewFrame/);
    assert.match(adminSettings, /surface="homepage-hero-overlay"/);
    assert.match(adminSettings, /HERO_OVERLAY_SIZE_OPTIONS/);
    assert.match(adminSettings, /HERO_OVERLAY_ALIGN_OPTIONS/);
    assert.match(adminSettings, /HERO_BUTTON_PLACEMENT_OPTIONS/);
    assert.match(adminSettings, /showShopButton/);
    assert.match(adminSettings, /showListBusinessButton/);
    assert.doesNotMatch(adminSettings, /heroHeadlineLine/);
    assert.doesNotMatch(adminSettings, /Overlay opacity/);
  });

  it("applies logo size consistently in admin preview", async () => {
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    const layout = await readFile(new URL("../components/layout.tsx", import.meta.url), "utf8");
    assert.match(adminSettings, /width: branding\.logoSizePx, height: branding\.logoSizePx/);
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
    const branding = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(branding, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.match(branding, /DASHBOARD_MOBILE_MAIN_TOP_CLASS/);
    assert.match(adminLayout, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.match(businessLayout, /DASHBOARD_MOBILE_NAV_TOP_CLASS/);
    assert.doesNotMatch(adminLayout, /top-16/);
    assert.doesNotMatch(businessLayout, /top-16/);
  });
});
