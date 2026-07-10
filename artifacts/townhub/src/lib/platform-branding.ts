import type { PlatformTheme } from "@workspace/api-client-react";

export const DEFAULT_PLATFORM_NAME = "LocalOrderHub";

export const DEFAULT_HERO_TAGLINE =
  "Your town's best bakeries, florists, markets, and shops—all in one place. Fresh, local, and community-driven.";

export const DEFAULT_FOOTER_TAGLINE =
  "Order Local. Support Local. The digital heart of your small town.";

export const DEFAULT_LOGO_SIZE_PX = 24;
export const LOGO_SIZE_MIN_PX = 16;
export const LOGO_SIZE_MAX_PX = 192;

/** Minimum header bar height (~64pt native nav) — web */
export const HEADER_BASE_MIN_HEIGHT_PX = 64;
/** Compact iOS navigation bar content height (excluding safe area) */
export const NATIVE_HEADER_CONTENT_HEIGHT_PX = 44;
/** Cap logo in the native nav so oversized brand logos don't inflate the bar */
export const NATIVE_HEADER_LOGO_MAX_PX = 28;
/** Vertical padding around the logo inside the header (total, both sides) */
export const HEADER_LOGO_VERTICAL_PADDING_PX = 8;

export function resolveHeaderMinHeightPx(
  logoSizePx: number,
  options?: { native?: boolean },
): number {
  if (options?.native) {
    const logo = Math.min(logoSizePx, NATIVE_HEADER_LOGO_MAX_PX);
    return Math.max(NATIVE_HEADER_CONTENT_HEIGHT_PX, logo + HEADER_LOGO_VERTICAL_PADDING_PX);
  }
  return Math.max(HEADER_BASE_MIN_HEIGHT_PX, logoSizePx + HEADER_LOGO_VERTICAL_PADDING_PX);
}

/** Set on the site shell; dashboard mobile nav reads this for positioning below the header */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height";

/** Mobile dashboard sub-nav sits flush under the site header (includes status-bar safe area on iOS). */
export const DASHBOARD_MOBILE_NAV_TOP_CLASS =
  "dashboard-mobile-subnav top-[calc(var(--site-header-height,4rem)+env(safe-area-inset-top,0px))]";

/** Main content offset: site header + safe area + mobile dashboard sub-nav (~3rem) */
export const DASHBOARD_MOBILE_MAIN_TOP_CLASS =
  "pt-[calc(var(--site-header-height,4rem)+env(safe-area-inset-top,0px)+3rem)] md:pt-0";

/** Native bottom tab bar height (excluding safe area) — floating pill + padding */
export const NATIVE_BOTTOM_TAB_HEIGHT_PX = 64;
export const NATIVE_BOTTOM_TAB_HEIGHT_CSS_VAR = "--native-bottom-tab-height";

/**
 * Legacy padding when the tab bar was `position: fixed`.
 * With the app-shell flex layout the tab bar is in-flow, so this is unused on native.
 */
export const NATIVE_MAIN_BOTTOM_PADDING_CLASS =
  "native-main-with-tabs pb-[calc(var(--native-bottom-tab-height,64px)+env(safe-area-inset-bottom,0px)+0.5rem)]";

export const LOGO_SIZE_PRESETS = [
  { value: 20, label: "Small" },
  { value: 24, label: "Medium" },
  { value: 32, label: "Large" },
  { value: 48, label: "Extra large" },
  { value: 56, label: "2X large" },
  { value: 72, label: "3X large" },
  { value: 96, label: "4X large" },
  { value: 128, label: "5X large" },
  { value: 160, label: "6X large" },
  { value: 192, label: "7X large" },
] as const;

/** @deprecated Use LOGO_SIZE_PRESETS — kept for backward compatibility */
export const LOGO_SIZE_OPTIONS = LOGO_SIZE_PRESETS.map((p) => p.value);

export type HeroImageFit = "cover" | "contain";
export type HeroImagePosition = "center" | "top" | "bottom";
export type HeroOverlaySize = "small" | "medium" | "large";
export type HeroOverlayAlign = "left" | "center" | "right";
export type HeroButtonPlacement = "bottom-left" | "bottom-center" | "bottom-right";

export const DEFAULT_HERO_IMAGE_FIT: HeroImageFit = "cover";
export const DEFAULT_HERO_IMAGE_POSITION: HeroImagePosition = "center";
export const DEFAULT_HERO_OVERLAY_SIZE: HeroOverlaySize = "medium";
export const DEFAULT_HERO_OVERLAY_ALIGN: HeroOverlayAlign = "center";
export const DEFAULT_SHOW_SHOP_BUTTON = true;
export const DEFAULT_SHOW_LIST_BUSINESS_BUTTON = true;
export const DEFAULT_HERO_BUTTON_PLACEMENT: HeroButtonPlacement = "bottom-center";

export const HERO_IMAGE_FIT_OPTIONS = [
  {
    value: "cover" as const,
    label: "Fill banner",
    helperText:
      "Fills the hero area for the best visual impact. The top or bottom may be cropped on some screen sizes.",
  },
  {
    value: "contain" as const,
    label: "Show full image",
    helperText:
      "Shows the entire image without cropping. Best if your image already includes text or important details.",
  },
] as const;

export function heroImageFitHelperText(fit: HeroImageFit): string {
  return HERO_IMAGE_FIT_OPTIONS.find((option) => option.value === fit)?.helperText ?? "";
}

export const HERO_IMAGE_POSITION_OPTIONS = [
  { value: "top" as const, label: "Top" },
  { value: "center" as const, label: "Center" },
  { value: "bottom" as const, label: "Bottom" },
] as const;

export const HERO_OVERLAY_SIZE_OPTIONS = [
  { value: "small" as const, label: "Small" },
  { value: "medium" as const, label: "Medium" },
  { value: "large" as const, label: "Large" },
] as const;

export const HERO_OVERLAY_ALIGN_OPTIONS = [
  { value: "left" as const, label: "Left" },
  { value: "center" as const, label: "Center" },
  { value: "right" as const, label: "Right" },
] as const;

export const HERO_BUTTON_PLACEMENT_OPTIONS = [
  { value: "bottom-left" as const, label: "Bottom Left" },
  { value: "bottom-center" as const, label: "Bottom Center" },
  { value: "bottom-right" as const, label: "Bottom Right" },
] as const;

/** Compact hero — web only; native home skips the marketing banner */
export const HERO_SECTION_MIN_HEIGHT_PX = 280;
/** Short mobile web hero so content appears quickly */
export const HERO_SECTION_MOBILE_MIN_HEIGHT_PX = 148;
export const HERO_SECTION_MIN_HEIGHT_CLASS =
  "min-h-[148px] md:min-h-[280px]";

export function resolvePlatformName(theme?: Pick<PlatformTheme, "platformName"> | null): string {
  const name = theme?.platformName?.trim();
  return name || DEFAULT_PLATFORM_NAME;
}

export function resolveTagline(theme?: Pick<PlatformTheme, "tagline" | "townName"> | null): string {
  const custom = theme?.tagline?.trim();
  if (custom) return custom;

  const town = theme?.townName?.trim();
  if (town) {
    return `Your ${town}'s best bakeries, florists, markets, and shops—all in one place. Fresh, local, and community-driven.`;
  }

  return DEFAULT_HERO_TAGLINE;
}

export function resolveFooterTagline(theme?: Pick<PlatformTheme, "tagline" | "townName"> | null): string {
  const custom = theme?.tagline?.trim();
  if (custom) return custom;

  const town = theme?.townName?.trim();
  if (town) {
    return `Order Local. Support Local. The digital heart of ${town}.`;
  }

  return DEFAULT_FOOTER_TAGLINE;
}

export function resolveShopCtaLabel(theme?: Pick<PlatformTheme, "townName"> | null): string {
  const town = theme?.townName?.trim();
  return town ? `Shop ${town}` : "Shop the Neighborhood";
}

export function resolveWeatherEnabled(
  theme?: Pick<PlatformTheme, "weatherEnabled"> | null,
): boolean {
  return theme?.weatherEnabled === true;
}

export function resolveWeatherLocation(
  theme?: Pick<PlatformTheme, "weatherLocation" | "townName"> | null,
): string {
  const configured = theme?.weatherLocation?.trim();
  if (configured) return configured;
  return theme?.townName?.trim() || "";
}

export function resolveLogoSizePx(theme?: Pick<PlatformTheme, "logoSizePx"> | null): number {
  const raw = theme?.logoSizePx;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
  if (!Number.isNaN(n) && n >= LOGO_SIZE_MIN_PX && n <= LOGO_SIZE_MAX_PX) return n;
  return DEFAULT_LOGO_SIZE_PX;
}

export function resolveHeroImageFit(
  theme?: Pick<PlatformTheme, "heroImageFit"> | null,
): HeroImageFit {
  return theme?.heroImageFit === "contain" ? "contain" : DEFAULT_HERO_IMAGE_FIT;
}

export function resolveHeroImagePosition(
  theme?: Pick<PlatformTheme, "heroImagePosition"> | null,
): HeroImagePosition {
  const pos = theme?.heroImagePosition;
  if (pos === "top" || pos === "bottom") return pos;
  return DEFAULT_HERO_IMAGE_POSITION;
}

export function resolveHeroOverlaySize(
  theme?: Pick<PlatformTheme, "heroOverlaySize"> | null,
): HeroOverlaySize {
  const size = theme?.heroOverlaySize;
  if (size === "small" || size === "large") return size;
  return DEFAULT_HERO_OVERLAY_SIZE;
}

export function resolveHeroOverlayAlign(
  theme?: Pick<PlatformTheme, "heroOverlayAlign"> | null,
): HeroOverlayAlign {
  const align = theme?.heroOverlayAlign;
  if (align === "left" || align === "right") return align;
  return DEFAULT_HERO_OVERLAY_ALIGN;
}

export function resolveShowShopButton(
  theme?: Pick<PlatformTheme, "showShopButton"> | null,
): boolean {
  return theme?.showShopButton !== false;
}

export function resolveShowListBusinessButton(
  theme?: Pick<PlatformTheme, "showListBusinessButton"> | null,
): boolean {
  return theme?.showListBusinessButton !== false;
}

export function resolveHeroButtonPlacement(
  theme?: Pick<PlatformTheme, "heroButtonPlacement"> | null,
): HeroButtonPlacement {
  const placement = theme?.heroButtonPlacement;
  if (placement === "bottom-left" || placement === "bottom-right") return placement;
  return DEFAULT_HERO_BUTTON_PLACEMENT;
}

/** Tailwind classes for hero background image object-fit and object-position */
export function heroImageObjectClasses(
  fit: HeroImageFit,
  position: HeroImagePosition,
): string {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const positionClass =
    position === "top" ? "object-top" : position === "bottom" ? "object-bottom" : "object-center";
  return `${fitClass} ${positionClass}`;
}

/**
 * Max-size constraints for the transparent overlay image. The overlay is never
 * cropped (object-contain), it only scales down responsively within a safe area.
 */
export function heroOverlaySizeClasses(size: HeroOverlaySize): string {
  switch (size) {
    case "small":
      return "max-h-[45%] max-w-[70%] md:max-w-[38%]";
    case "large":
      return "max-h-[78%] max-w-[92%] md:max-w-[72%]";
    case "medium":
    default:
      return "max-h-[62%] max-w-[85%] md:max-w-[55%]";
  }
}

/** Flexbox horizontal-justify class for a given left/center/right alignment. */
export function heroHorizontalJustifyClass(align: HeroOverlayAlign): string {
  return align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
}

/** Flexbox horizontal-justify class for the CTA button row placement. */
export function heroButtonPlacementJustifyClass(placement: HeroButtonPlacement): string {
  return placement === "bottom-left"
    ? "justify-start"
    : placement === "bottom-right"
      ? "justify-end"
      : "justify-center";
}

export type BrandingFields = {
  platformName: string;
  townName: string;
  tagline: string;
  logoUrl: string;
  logoSizePx: number;
  heroImageUrl: string;
  heroOverlayImageUrl: string;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  heroOverlaySize: HeroOverlaySize;
  heroOverlayAlign: HeroOverlayAlign;
  showShopButton: boolean;
  showListBusinessButton: boolean;
  heroButtonPlacement: HeroButtonPlacement;
};

export function themeToBrandingFields(theme: PlatformTheme): BrandingFields {
  return {
    platformName: theme.platformName?.trim() || DEFAULT_PLATFORM_NAME,
    townName: theme.townName?.trim() || "",
    tagline: theme.tagline?.trim() || "",
    logoUrl: theme.logoUrl?.trim() || "",
    logoSizePx: resolveLogoSizePx(theme),
    heroImageUrl: theme.heroImageUrl?.trim() || "",
    heroOverlayImageUrl: theme.heroOverlayImageUrl?.trim() || "",
    heroImageFit: resolveHeroImageFit(theme),
    heroImagePosition: resolveHeroImagePosition(theme),
    heroOverlaySize: resolveHeroOverlaySize(theme),
    heroOverlayAlign: resolveHeroOverlayAlign(theme),
    showShopButton: resolveShowShopButton(theme),
    showListBusinessButton: resolveShowListBusinessButton(theme),
    heroButtonPlacement: resolveHeroButtonPlacement(theme),
  };
}

/** Build API payload — empty strings clear nullable DB fields (undefined is stripped by JSON). */
export function buildBrandingPayload(fields: BrandingFields) {
  return {
    platformName: fields.platformName.trim(),
    townName: fields.townName.trim(),
    tagline: fields.tagline.trim(),
    logoUrl: fields.logoUrl.trim(),
    logoSizePx: fields.logoSizePx,
    heroImageUrl: fields.heroImageUrl.trim(),
    heroOverlayImageUrl: fields.heroOverlayImageUrl.trim(),
    heroImageFit: fields.heroImageFit,
    heroImagePosition: fields.heroImagePosition,
    heroOverlaySize: fields.heroOverlaySize,
    heroOverlayAlign: fields.heroOverlayAlign,
    showShopButton: fields.showShopButton,
    showListBusinessButton: fields.showListBusinessButton,
    heroButtonPlacement: fields.heroButtonPlacement,
  };
}
