import { createContext, useContext, useEffect, useMemo } from "react";
import { useGetPlatformTheme, getGetPlatformThemeQueryKey } from "@workspace/api-client-react";
import type { PlatformTheme } from "@workspace/api-client-react";
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
  heroButtonPlacement: HeroButtonPlacement;
  footerTagline: string;
  metaDescription: string;
  shopCtaLabel: string;
  logoUrl: string | null;
  logoSizePx: number;
  townName: string | null;
  weatherEnabled: boolean;
  weatherLocation: string;
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
  heroButtonPlacement: "bottom-center",
  footerTagline: resolveFooterTagline(null),
  metaDescription: resolveTagline(null),
  shopCtaLabel: resolveShopCtaLabel(null),
  logoUrl: null,
  logoSizePx: 24,
  townName: null,
  weatherEnabled: false,
  weatherLocation: "",
  themeLoading: true,
});

export function usePlatformBranding(): PlatformBranding {
  return useContext(PlatformBrandingContext);
}

export function PlatformThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme, isPending: themePending } = useGetPlatformTheme({
    query: {
      queryKey: getGetPlatformThemeQueryKey(),
      staleTime: 30 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
    },
  });

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
      heroButtonPlacement: resolveHeroButtonPlacement(theme),
      footerTagline: resolveFooterTagline(theme),
      metaDescription: resolveTagline(theme),
      shopCtaLabel: resolveShopCtaLabel(theme),
      logoUrl: theme?.logoUrl?.trim() || null,
      logoSizePx: resolveLogoSizePx(theme),
      townName: theme?.townName?.trim() || null,
      weatherEnabled: resolveWeatherEnabled(theme),
      weatherLocation: resolveWeatherLocation(theme),
      themeLoading: themePending && theme == null,
    };
  }, [theme, themePending]);

  useEffect(() => {
    applyPlatformThemeToRoot(theme);
    // Keep Android status bar / native chrome matched to the live canvas color.
    void import("@/lib/capacitor-shell").then((mod) => {
      void mod.syncNativeStatusBar();
    });
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
    const ogDescription = document.querySelector('meta[property="og:description"]');
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
