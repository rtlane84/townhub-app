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

export const LOGO_SIZE_OPTIONS = [20, 24, 32, 40, 48] as const;

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

export function resolveLogoSizePx(theme?: Pick<PlatformTheme, "logoSizePx"> | null): number {
  const raw = theme?.logoSizePx;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
  if (!Number.isNaN(n) && n >= 16 && n <= 64) return n;
  return DEFAULT_LOGO_SIZE_PX;
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
    logoSizePx: fields.logoSizePx,
  };
}
