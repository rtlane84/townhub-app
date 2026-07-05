import { createContext, useContext, useEffect, useMemo, type CSSProperties } from "react";
import { useGetPlatformTheme, getGetPlatformThemeQueryKey } from "@workspace/api-client-react";
import type { PlatformTheme } from "@workspace/api-client-react";
import {
  DEFAULT_PLATFORM_NAME,
  heroOverlayBackgroundStyle,
  heroPrimaryButtonStyle,
  resolveFooterTagline,
  resolveHeroHeadline,
  resolveHeroButtonColor,
  resolveHeroHeadlineAccentColor,
  resolveHeroImageFit,
  resolveHeroImagePosition,
  resolveHeroOverlayColor,
  resolveHeroOverlayOpacity,
  resolveLogoSizePx,
  resolvePlatformName,
  resolveShopCtaLabel,
  resolveShowHeroButtons,
  resolveShowHeroText,
  resolveTagline,
  resolveWeatherEnabled,
  resolveWeatherLocation,
  type HeroImageFit,
  type HeroImagePosition,
} from "@/lib/platform-branding";
import { applyPlatformThemeToRoot } from "@/lib/theme-colors";

export type PlatformBranding = {
  theme: PlatformTheme | undefined;
  platformName: string;
  heroHeadline: { line1: string; line2: string };
  heroHeadlineAccentColor: string;
  heroTagline: string;
  heroImageUrl: string | null;
  heroImageFit: HeroImageFit;
  heroImagePosition: HeroImagePosition;
  showHeroText: boolean;
  showHeroButtons: boolean;
  heroOverlayStyle: CSSProperties | null;
  heroPrimaryButtonStyle: CSSProperties | null;
  footerTagline: string;
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
  heroHeadline: resolveHeroHeadline(null),
  heroHeadlineAccentColor: resolveHeroHeadlineAccentColor(null),
  heroTagline: resolveTagline(null),
  heroImageUrl: null,
  heroImageFit: "cover",
  heroImagePosition: "center",
  showHeroText: true,
  showHeroButtons: true,
  heroOverlayStyle: null,
  heroPrimaryButtonStyle: null,
  footerTagline: resolveFooterTagline(null),
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
    const heroImage = theme?.heroImageUrl?.trim() || null;
    const overlayColor = resolveHeroOverlayColor(theme);
    const overlayOpacity = resolveHeroOverlayOpacity(theme);
    const heroButtonColor = resolveHeroButtonColor(theme);
    return {
      theme,
      platformName: resolvePlatformName(theme),
      heroHeadline: resolveHeroHeadline(theme),
      heroHeadlineAccentColor: resolveHeroHeadlineAccentColor(theme),
      heroTagline: resolveTagline(theme),
      heroImageUrl: heroImage,
      heroImageFit: resolveHeroImageFit(theme),
      heroImagePosition: resolveHeroImagePosition(theme),
      showHeroText: resolveShowHeroText(theme),
      showHeroButtons: resolveShowHeroButtons(theme),
      heroOverlayStyle: heroImage
        ? heroOverlayBackgroundStyle(overlayColor, overlayOpacity)
        : null,
      heroPrimaryButtonStyle: heroImage ? heroPrimaryButtonStyle(heroButtonColor) : null,
      footerTagline: resolveFooterTagline(theme),
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
  }, [theme]);

  useEffect(() => {
    document.title = branding.platformName;
    const description = branding.heroTagline;
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
  }, [branding.platformName, branding.heroTagline]);

  return (
    <PlatformBrandingContext.Provider value={branding}>
      {children}
    </PlatformBrandingContext.Provider>
  );
}
