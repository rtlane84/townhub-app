import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("platform branding hero settings", () => {
  it("preserves existing behavior with cover/center defaults and opt-out visibility", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /DEFAULT_HERO_IMAGE_FIT.*= "cover"/);
    assert.match(source, /DEFAULT_HERO_IMAGE_POSITION.*= "center"/);
    assert.match(source, /DEFAULT_SHOW_HERO_TEXT = true/);
    assert.match(source, /DEFAULT_SHOW_HERO_BUTTONS = true/);
    assert.match(source, /theme\?\.heroImageFit === "contain" \? "contain" : DEFAULT_HERO_IMAGE_FIT/);
    assert.match(source, /theme\?\.showHeroText !== false/);
    assert.match(source, /theme\?\.showHeroButtons !== false/);
  });

  it("maps cover vs contain and position to object-fit/position classes", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /fit === "contain" \? "object-contain" : "object-cover"/);
    assert.match(source, /position === "top" \? "object-top"/);
    assert.match(source, /position === "bottom" \? "object-bottom" : "object-center"/);
  });

  it("includes hero display fields in branding payload", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /heroImageFit: fields\.heroImageFit/);
    assert.match(source, /heroImagePosition: fields\.heroImagePosition/);
    assert.match(source, /showHeroText: fields\.showHeroText/);
    assert.match(source, /showHeroButtons: fields\.showHeroButtons/);
  });

  it("expands logo size presets through extra large", async () => {
    const source = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(source, /label: "Small"/);
    assert.match(source, /label: "Medium"/);
    assert.match(source, /label: "Large"/);
    assert.match(source, /label: "Extra large"/);
    assert.match(source, /label: "2X large"/);
    assert.match(source, /label: "3X large"/);
    assert.match(source, /label: "4X large"/);
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
    assert.match(branding, /value: "cover"/);
    assert.match(branding, /value: "contain"/);
    assert.match(adminSettings, /Fill banner can still crop depending on screen size/);
    assert.match(adminSettings, /HERO_IMAGE_FIT_OPTIONS/);
  });
});

describe("hero preview parity with live homepage", () => {
  it("uses the same min-height and shared image layers on live hero and admin preview", async () => {
    const homeHero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    const previewFrame = await readFile(
      new URL("../components/hero-preview-frame.tsx", import.meta.url),
      "utf8",
    );
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    const layers = await readFile(
      new URL("../components/hero-image-layers.tsx", import.meta.url),
      "utf8",
    );

    assert.match(homeHero, /HERO_SECTION_MIN_HEIGHT_CLASS/);
    assert.match(homeHero, /py-\[3\.825rem\] md:py-24/);
    const branding = await readFile(new URL("./platform-branding.ts", import.meta.url), "utf8");
    assert.match(branding, /min-h-\[257px\] md:min-h-\[420px\]/);
    assert.match(previewFrame, /HERO_SECTION_MIN_HEIGHT_CLASS/);
    assert.match(homeHero, /HeroImageLayers/);
    assert.match(previewFrame, /HeroImageLayers/);
    assert.match(layers, /heroImageObjectClasses/);
    assert.match(adminSettings, /HeroPreviewFrame/);
    assert.match(adminSettings, /heroImageFit=\{branding\.heroImageFit\}/);
    assert.match(adminSettings, /HERO_IMAGE_FIT_OPTIONS/);
    assert.match(adminSettings, /The preview uses the same crop behavior as the live homepage/);
    assert.match(adminSettings, /showHeroText=\{branding\.showHeroText\}/);
    assert.match(adminSettings, /showHeroButtons=\{branding\.showHeroButtons\}/);
    assert.doesNotMatch(layers, /blur/);
    assert.match(layers, /from-primary\/10 via-background to-muted\/40/);
  });

  it("hides hero text and buttons on the live homepage when settings are off", async () => {
    const homeHero = await readFile(
      new URL("../components/home-hero-section.tsx", import.meta.url),
      "utf8",
    );
    assert.match(homeHero, /showHeroText/);
    assert.match(homeHero, /showHeroButtons/);
    assert.match(homeHero, /\{showHeroText \?/);
    assert.match(homeHero, /\{showHeroButtons \?/);
  });

  it("applies logo size consistently in admin preview", async () => {
    const adminSettings = await readFile(
      new URL("../pages/dashboard/admin/settings.tsx", import.meta.url),
      "utf8",
    );
    const layout = await readFile(new URL("../components/layout.tsx", import.meta.url), "utf8");
    assert.match(adminSettings, /width: branding\.logoSizePx, height: branding\.logoSizePx/);
    assert.match(layout, /width: logoSizePx, height: logoSizePx/);
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
