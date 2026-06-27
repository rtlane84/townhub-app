import type { CSSProperties } from "react";
import type { PlatformTheme } from "@workspace/api-client-react";

export const PLATFORM_THEME_DEFAULTS = {
  primaryColor: "#1E3A8A",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  buttonColor: "#1E3A8A",
} as const;

export type ThemeColorFields = {
  accentColor?: string | null;
  buttonColor?: string | null;
};

/** Normalize #RGB / #RRGGBB to #rrggbb lowercase */
export function normalizeHex(value?: string | null): string | null {
  if (!value?.trim()) return null;
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
}

/** Convert a 6-digit hex color to "H S% L%" for CSS HSL variables */
export function hexToHsl(hex: string): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return "";
  const clean = normalized.slice(1);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return hex;
  const clean = normalized.slice(1);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mergePlatformTheme(theme?: PlatformTheme | null) {
  return {
    primaryColor: normalizeHex(theme?.primaryColor) ?? PLATFORM_THEME_DEFAULTS.primaryColor,
    accentColor: normalizeHex(theme?.accentColor) ?? PLATFORM_THEME_DEFAULTS.accentColor,
    backgroundColor: normalizeHex(theme?.backgroundColor) ?? PLATFORM_THEME_DEFAULTS.backgroundColor,
    buttonColor:
      normalizeHex(theme?.buttonColor) ??
      normalizeHex(theme?.primaryColor) ??
      PLATFORM_THEME_DEFAULTS.buttonColor,
    headingColor: normalizeHex(theme?.headingColor),
  };
}

export function applyPlatformThemeToRoot(theme?: PlatformTheme | null): void {
  const merged = mergePlatformTheme(theme);
  const root = document.documentElement;

  const primaryHsl = hexToHsl(merged.primaryColor);
  const accentHsl = hexToHsl(merged.accentColor);
  const backgroundHsl = hexToHsl(merged.backgroundColor);
  const buttonHsl = hexToHsl(merged.buttonColor);

  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);
    root.style.setProperty("--sidebar-primary", primaryHsl);
    root.style.setProperty("--sidebar-ring", primaryHsl);
    root.style.setProperty("--chart-1", primaryHsl);
  }

  if (accentHsl) {
    root.style.setProperty("--accent", accentHsl);
    root.style.setProperty("--chart-3", accentHsl);
  }

  if (backgroundHsl) {
    root.style.setProperty("--background", backgroundHsl);
  }

  if (buttonHsl) {
    root.style.setProperty("--platform-button", buttonHsl);
  }

  if (merged.headingColor) {
    root.style.setProperty("--platform-heading", merged.headingColor);
  } else {
    root.style.removeProperty("--platform-heading");
  }
}

export function resolveBusinessThemeColors(
  business: ThemeColorFields,
  platform?: PlatformTheme | null,
) {
  const platformMerged = mergePlatformTheme(platform);
  return {
    accent:
      normalizeHex(business.accentColor) ?? platformMerged.accentColor,
    button:
      normalizeHex(business.buttonColor) ??
      platformMerged.buttonColor,
    primary:
      normalizeHex(business.buttonColor) ??
      platformMerged.primaryColor,
  };
}

export function businessThemeStyle(
  business: ThemeColorFields,
  platform?: PlatformTheme | null,
): CSSProperties {
  const colors = resolveBusinessThemeColors(business, platform);
  const primaryHsl = hexToHsl(colors.primary);
  const buttonHsl = hexToHsl(colors.button);
  const accentHsl = hexToHsl(colors.accent);

  const vars: Record<string, string> = {};
  if (primaryHsl) {
    vars["--primary"] = primaryHsl;
    vars["--ring"] = primaryHsl;
  }
  if (buttonHsl) {
    vars["--platform-button"] = buttonHsl;
  }
  if (accentHsl) {
    vars["--business-accent"] = accentHsl;
  }

  return vars as CSSProperties;
}

export function businessListingCardVars(accentColor?: string | null): CSSProperties {
  const hex = normalizeHex(accentColor);
  if (!hex) return {};
  return {
    "--biz-accent": hex,
    "--biz-accent-border": hexWithAlpha(hex, 0.4),
    "--biz-accent-soft": hexWithAlpha(hex, 0.1),
    "--biz-accent-icon": hexWithAlpha(hex, 0.75),
  } as CSSProperties;
}

export function businessHeroPlaceholderStyle(accentColor?: string | null): CSSProperties | undefined {
  const hex = normalizeHex(accentColor);
  if (!hex) return undefined;
  return {
    backgroundColor: hexWithAlpha(hex, 0.08),
    color: hexWithAlpha(hex, 0.45),
  };
}

export function businessIconAccentStyle(accentColor?: string | null): CSSProperties | undefined {
  const hex = normalizeHex(accentColor);
  if (!hex) return undefined;
  return { color: hexWithAlpha(hex, 0.85) };
}

export function businessTypeBadgeStyle(accentColor?: string | null): CSSProperties | undefined {
  const hex = normalizeHex(accentColor);
  if (!hex) return undefined;
  return {
    backgroundColor: hexWithAlpha(hex, 0.12),
    borderColor: hexWithAlpha(hex, 0.35),
    color: hex,
  };
}

export function accentTintStyle(hex: string, alpha = 0.1): CSSProperties {
  const normalized = normalizeHex(hex);
  if (!normalized) return {};
  return { backgroundColor: hexWithAlpha(normalized, alpha) };
}
