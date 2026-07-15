import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  useGetPlatformTheme,
  getGetPlatformThemeQueryKey,
} from "@workspace/api-client-react";
import type { PlatformTheme, TownPhoto } from "@workspace/api-client-react";
import {
  DEFAULT_PLATFORM_NAME,
  resolveFooterTagline,
  resolveHeroButtonPlacement,
  resolveHeroImageFit,
  resolveHeroImagePosition,
  resolveHeroOverlayAlign,
  resolveHeroOverlaySize,
  resolveLogoSizePx,
  resolvePlatformName,
  resolveShopCtaLabel,
  resolveShowListBusinessButton,
  resolveShowHeroOverlay,
  resolveShowShopButton,
  resolveTagline,
  resolveWeatherEnabled,
  resolveWeatherLocation,
  type HeroButtonPlacement,
  type HeroImageFit,
  type HeroImagePosition,
  type HeroOverlayAlign,
  type HeroOverlaySize,
} from "@/lib/platform-branding";
import { applyPlatformThemeToRoot } from "@/lib/theme-colors";
import { syncNativeStatusBar } from "@/lib/capacitor-shell";
import {
  readCachedPlatformTheme,
  writeCachedPlatformTheme,
} from "@/lib/platform-theme-cache";
import {
  DEFAULT_PLATFORM_TIMEZONE,
  resolvePlatformTimeZone,
} from "@workspace/api-zod";

export type PlatformBranding = {
  theme: PlatformTheme | undefined;
  platformName: string;
  heroImageUrl: string | null;
  heroOverlayImageUrl: string | null;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  heroOverlaySize: HeroOverlaySize;
  heroOverlayAlign: HeroOverlayAlign;
  showShopButton: boolean;
  showListBusinessButton: boolean;
  showHeroOverlay: boolean;
  heroButtonPlacement: HeroButtonPlacement;
  footerTagline: string;
  metaDescription: string;
  shopCtaLabel: string;
  logoUrl: string | null;
  logoSizePx: number;
  townName: string | null;
  townPhotos: TownPhoto[];
  weatherEnabled: boolean;
  weatherLocation: string;
  /** IANA platform timezone for civil "today" and availability. */
  timezone: string;
  themeLoading: boolean;
};

const PlatformBrandingContext = createContext<PlatformBranding>({
  theme: undefined,
  platformName: DEFAULT_PLATFORM_NAME,
  heroImageUrl: null,
  heroOverlayImageUrl: null,
  heroImageFit: "cover",
  heroImagePosition: "center",
  heroOverlaySize: "medium",
  heroOverlayAlign: "center",
  showShopButton: true,
  showListBusinessButton: true,
  showHeroOverlay: true,
  heroButtonPlacement: "bottom-center",
  footerTagline: resolveFooterTagline(null),
  metaDescription: resolveTagline(null),
  shopCtaLabel: resolveShopCtaLabel(null),
  logoUrl: null,
  logoSizePx: 24,
  townName: null,
  townPhotos: [],
  weatherEnabled: false,
  weatherLocation: "",
  timezone: DEFAULT_PLATFORM_TIMEZONE,
  themeLoading: true,
});

export function usePlatformBranding(): PlatformBranding {
  return useContext(PlatformBrandingContext);
}

export function PlatformThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const cachedTheme = useMemo(() => readCachedPlatformTheme(), []);
  const [themeWaitTimedOut, setThemeWaitTimedOut] = useState(false);

  const { data: theme, isPending: themePending } = useGetPlatformTheme({
    query: {
      queryKey: getGetPlatformThemeQueryKey(),
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
      ...(cachedTheme ? { initialData: cachedTheme } : {}),
    },
  });

  useEffect(() => {
    if (!themePending || theme != null) {
      setThemeWaitTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setThemeWaitTimedOut(true), 2500);
    return () => window.clearTimeout(timer);
  }, [themePending, theme]);

  const branding = useMemo<PlatformBranding>(() => {
    return {
      theme,
      platformName: resolvePlatformName(theme),
      heroImageUrl: theme?.heroImageUrl?.trim() || null,
      heroOverlayImageUrl: theme?.heroOverlayImageUrl?.trim() || null,
      heroImageFit: resolveHeroImageFit(theme),
      heroImagePosition: resolveHeroImagePosition(theme),
      heroOverlaySize: resolveHeroOverlaySize(theme),
      heroOverlayAlign: resolveHeroOverlayAlign(theme),
      showShopButton: resolveShowShopButton(theme),
      showListBusinessButton: resolveShowListBusinessButton(theme),
      showHeroOverlay: resolveShowHeroOverlay(theme),
      heroButtonPlacement: resolveHeroButtonPlacement(theme),
      footerTagline: resolveFooterTagline(theme),
      metaDescription: resolveTagline(theme),
      shopCtaLabel: resolveShopCtaLabel(theme),
      logoUrl: theme?.logoUrl?.trim() || null,
      logoSizePx: resolveLogoSizePx(theme),
      townName: theme?.townName?.trim() || null,
      townPhotos: Array.isArray(theme?.townPhotos) ? theme.townPhotos : [],
      weatherEnabled: resolveWeatherEnabled(theme),
      weatherLocation: resolveWeatherLocation(theme),
      timezone: resolvePlatformTimeZone(theme?.timezone),
      // Cached initialData means theme is non-null on first paint — not "loading".
      // Cap / slow network must not pin the hero pulse forever.
      themeLoading: themePending && theme == null && !themeWaitTimedOut,
    };
  }, [theme, themePending, themeWaitTimedOut]);

  useEffect(() => {
    if (theme) {
      writeCachedPlatformTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    applyPlatformThemeToRoot(theme);
    // Keep Android status bar / native chrome matched to the live canvas color.
    void syncNativeStatusBar();
  }, [theme]);

  useEffect(() => {
    document.title = branding.platformName;
    const description = branding.metaDescription;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", branding.platformName);
    }
    const ogDescription = document.querySelector(
      'meta[property="og:description"]',
    );
    if (ogDescription) {
      ogDescription.setAttribute("content", description);
    }
  }, [branding.platformName, branding.metaDescription]);

  return (
    <PlatformBrandingContext.Provider value={branding}>
      {children}
    </PlatformBrandingContext.Provider>
  );
}
