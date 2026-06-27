import type { PlatformTheme } from "@workspace/api-client-react";

export const DEFAULT_PLATFORM_NAME = "LocalOrderHub";

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

export function resolveHeroHeadline(theme?: Pick<PlatformTheme, "townName"> | null): {
  line1: string;
  line2: string;
} {
  const town = theme?.townName?.trim();
  return {
    line1: town ? `Order Local in ${town}.` : "Order Local.",
    line2: "Support Local.",
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

export function themeToBrandingFields(theme: PlatformTheme): {
  platformName: string;
  townName: string;
  tagline: string;
  logoUrl: string;
  logoSizePx: number;
} {
  return {
    platformName: theme.platformName?.trim() || DEFAULT_PLATFORM_NAME,
    townName: theme.townName?.trim() || "",
    tagline: theme.tagline?.trim() || "",
    logoUrl: theme.logoUrl?.trim() || "",
    logoSizePx: resolveLogoSizePx(theme),
  };
}

/** Build API payload — empty strings clear nullable DB fields (undefined is stripped by JSON). */
export function buildBrandingPayload(fields: {
  platformName: string;
  townName: string;
  tagline: string;
  logoUrl: string;
  logoSizePx: number;
}) {
  return {
    platformName: fields.platformName.trim(),
    townName: fields.townName.trim(),
    tagline: fields.tagline.trim(),
    logoUrl: fields.logoUrl.trim(),
    logoSizePx: fields.logoSizePx,
  };
}
