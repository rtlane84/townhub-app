import type { CSSProperties } from "react";
import type { PlatformTheme } from "@workspace/api-client-react";
import { contrastingTextColor, normalizeHex, PLATFORM_THEME_DEFAULTS } from "./theme-colors";

export const DEFAULT_PLATFORM_NAME = "LocalOrderHub";

export const DEFAULT_HERO_OVERLAY_COLOR = "#000000";
export const DEFAULT_HERO_OVERLAY_OPACITY = 45;
export const DEFAULT_HERO_BUTTON_COLOR = "#ffffff";
export const DEFAULT_HERO_HEADLINE_LINE1 = "Order Local.";
export const DEFAULT_HERO_HEADLINE_LINE2 = "Support Local.";

export const DEFAULT_HERO_TAGLINE =
  "Your town's best bakeries, florists, markets, and shops—all in one place. Fresh, local, and community-driven.";

export const DEFAULT_FOOTER_TAGLINE =
  "Order Local. Support Local. The digital heart of your small town.";

export const DEFAULT_LOGO_SIZE_PX = 24;
export const LOGO_SIZE_MIN_PX = 16;
export const LOGO_SIZE_MAX_PX = 192;

/** Minimum header bar height (matches legacy h-16) */
export const HEADER_BASE_MIN_HEIGHT_PX = 64;
/** Vertical padding around the logo inside the header (total, both sides) */
export const HEADER_LOGO_VERTICAL_PADDING_PX = 4;

export function resolveHeaderMinHeightPx(logoSizePx: number): number {
  return Math.max(HEADER_BASE_MIN_HEIGHT_PX, logoSizePx + HEADER_LOGO_VERTICAL_PADDING_PX);
}

/** Set on the site shell; dashboard mobile nav reads this for positioning below the header */
export const SITE_HEADER_HEIGHT_CSS_VAR = "--site-header-height";

/** Mobile dashboard sub-nav sits flush under the dynamic site header */
export const DASHBOARD_MOBILE_NAV_TOP_CLASS = "top-[var(--site-header-height,4rem)]";

/** Main content offset: site header + mobile dashboard sub-nav (~3rem) */
export const DASHBOARD_MOBILE_MAIN_TOP_CLASS =
  "pt-[calc(var(--site-header-height,4rem)+3rem)] md:pt-0";

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

export const DEFAULT_HERO_IMAGE_FIT: HeroImageFit = "cover";
export const DEFAULT_HERO_IMAGE_POSITION: HeroImagePosition = "center";
export const DEFAULT_SHOW_HERO_TEXT = true;
export const DEFAULT_SHOW_HERO_BUTTONS = true;

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

/** Matches the live homepage hero section min-height (desktop) */
export const HERO_SECTION_MIN_HEIGHT_PX = 420;
/** Shorter hero on mobile (~28% then −10% then −15% vs 420px desktop) */
export const HERO_SECTION_MOBILE_MIN_HEIGHT_PX = 257;
export const HERO_SECTION_MIN_HEIGHT_CLASS =
  "min-h-[257px] md:min-h-[420px]";

export function resolvePlatformName(theme?: Pick<PlatformTheme, "platformName"> | null): string {
  const name = theme?.platformName?.trim();
  return name || DEFAULT_PLATFORM_NAME;
}

export function resolveHeroHeadline(
  theme?: Pick<PlatformTheme, "heroHeadlineLine1" | "heroHeadlineLine2"> | null,
): {
  line1: string;
  line2: string;
} {
  const line1 = theme?.heroHeadlineLine1?.trim();
  const line2 = theme?.heroHeadlineLine2?.trim();
  return {
    line1: line1 || DEFAULT_HERO_HEADLINE_LINE1,
    line2: line2 || DEFAULT_HERO_HEADLINE_LINE2,
  };
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

export function resolveShowHeroText(
  theme?: Pick<PlatformTheme, "showHeroText"> | null,
): boolean {
  return theme?.showHeroText !== false;
}

export function resolveShowHeroButtons(
  theme?: Pick<PlatformTheme, "showHeroButtons"> | null,
): boolean {
  return theme?.showHeroButtons !== false;
}

/** Tailwind classes for hero image object-fit and object-position */
export function heroImageObjectClasses(
  fit: HeroImageFit,
  position: HeroImagePosition,
): string {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  const positionClass =
    position === "top" ? "object-top" : position === "bottom" ? "object-bottom" : "object-center";
  return `${fitClass} ${positionClass}`;
}

export function resolveHeroOverlayColor(
  theme?: Pick<PlatformTheme, "heroOverlayColor"> | null,
): string {
  return normalizeHex(theme?.heroOverlayColor) ?? DEFAULT_HERO_OVERLAY_COLOR;
}

export function resolveHeroOverlayOpacity(
  theme?: Pick<PlatformTheme, "heroOverlayOpacity"> | null,
): number {
  const raw = theme?.heroOverlayOpacity;
  if (raw == null) return DEFAULT_HERO_OVERLAY_OPACITY;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (Number.isNaN(n)) return DEFAULT_HERO_OVERLAY_OPACITY;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** CSS background for the homepage hero tint layer */
export function heroOverlayBackgroundStyle(
  color: string,
  opacityPercent: number,
): { backgroundColor: string } {
  const hex = normalizeHex(color) ?? DEFAULT_HERO_OVERLAY_COLOR;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = resolveHeroOverlayOpacity({ heroOverlayOpacity: opacityPercent }) / 100;
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})` };
}

export function resolveHeroButtonColor(
  theme?: Pick<PlatformTheme, "heroButtonColor"> | null,
): string {
  return normalizeHex(theme?.heroButtonColor) ?? DEFAULT_HERO_BUTTON_COLOR;
}

/** "Support Local." accent — custom color or platform primary */
export function resolveHeroHeadlineAccentColor(
  theme?: Pick<PlatformTheme, "heroHeadlineAccentColor" | "primaryColor"> | null,
): string {
  return (
    normalizeHex(theme?.heroHeadlineAccentColor) ??
    normalizeHex(theme?.primaryColor) ??
    PLATFORM_THEME_DEFAULTS.primaryColor
  );
}

/** Inline styles for the homepage hero primary CTA */
export function heroPrimaryButtonStyle(buttonColor: string): CSSProperties {
  const bg = normalizeHex(buttonColor) ?? DEFAULT_HERO_BUTTON_COLOR;
  return {
    backgroundColor: bg,
    color: contrastingTextColor(bg),
    borderColor: bg,
  };
}

export function themeToBrandingFields(theme: PlatformTheme): {
  platformName: string;
  townName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  heroOverlayColor: string;
  heroOverlayOpacity: number;
  heroButtonColor: string;
  heroHeadlineAccentColor: string;
  heroHeadlineLine1: string;
  heroHeadlineLine2: string;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  showHeroText: boolean;
  showHeroButtons: boolean;
  logoSizePx: number;
} {
  return {
    platformName: theme.platformName?.trim() || DEFAULT_PLATFORM_NAME,
    townName: theme.townName?.trim() || "",
    tagline: theme.tagline?.trim() || "",
    logoUrl: theme.logoUrl?.trim() || "",
    heroImageUrl: theme.heroImageUrl?.trim() || "",
    heroOverlayColor: resolveHeroOverlayColor(theme),
    heroOverlayOpacity: resolveHeroOverlayOpacity(theme),
    heroButtonColor: resolveHeroButtonColor(theme),
    heroHeadlineAccentColor: resolveHeroHeadlineAccentColor(theme),
    heroHeadlineLine1: theme.heroHeadlineLine1?.trim() || "",
    heroHeadlineLine2: theme.heroHeadlineLine2?.trim() || "",
    heroImageFit: resolveHeroImageFit(theme),
    heroImagePosition: resolveHeroImagePosition(theme),
    showHeroText: resolveShowHeroText(theme),
    showHeroButtons: resolveShowHeroButtons(theme),
    logoSizePx: resolveLogoSizePx(theme),
  };
}

/** Build API payload — empty strings clear nullable DB fields (undefined is stripped by JSON). */
export function buildBrandingPayload(fields: {
  platformName: string;
  townName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  heroOverlayColor: string;
  heroOverlayOpacity: number;
  heroButtonColor: string;
  heroHeadlineAccentColor: string;
  heroHeadlineLine1: string;
  heroHeadlineLine2: string;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  showHeroText: boolean;
  showHeroButtons: boolean;
  logoSizePx: number;
}) {
  return {
    platformName: fields.platformName.trim(),
    townName: fields.townName.trim(),
    tagline: fields.tagline.trim(),
    logoUrl: fields.logoUrl.trim(),
    heroImageUrl: fields.heroImageUrl.trim(),
    heroOverlayColor: fields.heroOverlayColor.trim(),
    heroOverlayOpacity: resolveHeroOverlayOpacity({
      heroOverlayOpacity: fields.heroOverlayOpacity,
    }),
    heroButtonColor: fields.heroButtonColor.trim(),
    heroHeadlineAccentColor: fields.heroHeadlineAccentColor.trim(),
    heroHeadlineLine1: fields.heroHeadlineLine1.trim(),
    heroHeadlineLine2: fields.heroHeadlineLine2.trim(),
    heroImageFit: fields.heroImageFit,
    heroImagePosition: fields.heroImagePosition,
    showHeroText: fields.showHeroText,
    showHeroButtons: fields.showHeroButtons,
    logoSizePx: fields.logoSizePx,
  };
}
