import { useState, useEffect, useRef } from "react";
import {
  useGetPlatformTheme,
  useUpdatePlatformTheme,
  getGetPlatformThemeQueryKey,
  getGetWeatherQueryKey,
} from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { SettingsSection, SettingsToggleRow } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, Save, RotateCcw, CheckCircle, Type, CloudSun, ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { ImageField } from "@/components/image-field";
import { HeroPreviewFrame } from "@/components/hero-preview-frame";
import { PlatformBrandMark } from "@/components/platform-brand-mark";
import { PLATFORM_THEME_DEFAULTS } from "@/lib/theme-colors";
import { splitPlatformBrandName } from "@/lib/platform-brand-name";

import {
  DEFAULT_HERO_BUTTON_PLACEMENT,
  DEFAULT_HERO_IMAGE_FIT,
  DEFAULT_HERO_IMAGE_POSITION,
  DEFAULT_HERO_OVERLAY_ALIGN,
  DEFAULT_HERO_OVERLAY_SIZE,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_SHOW_LIST_BUSINESS_BUTTON,
  DEFAULT_SHOW_SHOP_BUTTON,
  buildBrandingPayload,
  DEFAULT_LOGO_SIZE_PX,
  HERO_BUTTON_PLACEMENT_OPTIONS,
  HERO_IMAGE_FIT_OPTIONS,
  HERO_IMAGE_POSITION_OPTIONS,
  HERO_OVERLAY_ALIGN_OPTIONS,
  HERO_OVERLAY_SIZE_OPTIONS,
  heroImageFitHelperText,
  LOGO_SIZE_PRESETS,
  resolveFooterTagline,
  resolveShopCtaLabel,
  resolveTagline,
  resolveWeatherLocation,
  themeToBrandingFields,
  type BrandingFields,
  type HeroButtonPlacement,
  type HeroImageFit,
  type HeroImagePosition,
  type HeroOverlayAlign,
  type HeroOverlaySize,
} from "@/lib/platform-branding";

type ColorKey = "primaryColor" | "accentColor" | "backgroundColor" | "buttonColor" | "headingColor";
type BrandWordColorKey = "brandPrefixColor" | "brandTownColor" | "brandHubColor";

const COLOR_DEFAULTS: Record<ColorKey, string> = {
  primaryColor: PLATFORM_THEME_DEFAULTS.primaryColor,
  accentColor: PLATFORM_THEME_DEFAULTS.accentColor,
  backgroundColor: PLATFORM_THEME_DEFAULTS.backgroundColor,
  buttonColor: PLATFORM_THEME_DEFAULTS.buttonColor,
  headingColor: "",
};

const BRAND_WORD_COLOR_DEFAULTS: Record<BrandWordColorKey, string> = {
  brandPrefixColor: "",
  brandTownColor: "",
  brandHubColor: "",
};

const COLOR_FIELDS: Array<{ key: ColorKey; label: string; description: string }> = [
  {
    key: "primaryColor",
    label: "Brand color",
    description: "Links, active nav, and default marketplace accents on web and iOS.",
  },
  {
    key: "accentColor",
    label: "Accent color",
    description: "Secondary highlights — badges, promotions, and shop CTAs.",
  },
  {
    key: "backgroundColor",
    label: "Page background",
    description: "Canvas behind marketplace pages (web and iOS).",
  },
  {
    key: "buttonColor",
    label: "Button color",
    description: "Optional override for primary buttons. Leave matching brand color if unsure.",
  },
  {
    key: "headingColor",
    label: "Heading color",
    description: "Optional — section titles. Leave blank to use the default navy heading.",
  },
];

const BRANDING_DEFAULTS: BrandingFields = {
  platformName: DEFAULT_PLATFORM_NAME,
  townName: "",
  tagline: "",
  logoUrl: "",
  logoSizePx: DEFAULT_LOGO_SIZE_PX,
  heroImageUrl: "",
  heroOverlayImageUrl: "",
  heroImageFit: DEFAULT_HERO_IMAGE_FIT,
  heroImagePosition: DEFAULT_HERO_IMAGE_POSITION,
  heroOverlaySize: DEFAULT_HERO_OVERLAY_SIZE,
  heroOverlayAlign: DEFAULT_HERO_OVERLAY_ALIGN,
  showShopButton: DEFAULT_SHOW_SHOP_BUTTON,
  showListBusinessButton: DEFAULT_SHOW_LIST_BUSINESS_BUTTON,
  heroButtonPlacement: DEFAULT_HERO_BUTTON_PLACEMENT,
};

type WeatherFields = {
  weatherEnabled: boolean;
  weatherLocation: string;
};

const WEATHER_DEFAULTS: WeatherFields = {
  weatherEnabled: false,
  weatherLocation: "",
};

function logoSizeOptions(currentPx: number): Array<{ value: number; label: string }> {
  const presets: Array<{ value: number; label: string }> = LOGO_SIZE_PRESETS.map((p) => ({
    value: p.value,
    label: p.label,
  }));
  if (!presets.some((p) => p.value === currentPx)) {
    presets.push({ value: currentPx, label: `${currentPx}px` });
  }
  return presets;
}

export default function AdminSettings() {
  const { data: theme, isLoading } = useGetPlatformTheme();
  const updateTheme = useUpdatePlatformTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [colors, setColors] = useState(COLOR_DEFAULTS);
  const [brandWordColors, setBrandWordColors] = useState(BRAND_WORD_COLOR_DEFAULTS);
  const [branding, setBranding] = useState<BrandingFields>(BRANDING_DEFAULTS);
  const [weatherSettings, setWeatherSettings] = useState<WeatherFields>(WEATHER_DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);
  const lastSyncAt = useRef<string | null>(null);

  useEffect(() => {
    if (!theme || isDirty) return;
    if (theme.updatedAt && theme.updatedAt === lastSyncAt.current) return;
    lastSyncAt.current = theme.updatedAt ?? null;
    setColors({
      primaryColor: theme.primaryColor || COLOR_DEFAULTS.primaryColor,
      accentColor: theme.accentColor || COLOR_DEFAULTS.accentColor,
      backgroundColor: theme.backgroundColor || COLOR_DEFAULTS.backgroundColor,
      buttonColor: theme.buttonColor || COLOR_DEFAULTS.buttonColor,
      headingColor: theme.headingColor || "",
    });
    setBrandWordColors({
      brandPrefixColor: theme.brandPrefixColor || "",
      brandTownColor: theme.brandTownColor || "",
      brandHubColor: theme.brandHubColor || "",
    });
    setBranding(themeToBrandingFields(theme));
    setWeatherSettings({
      weatherEnabled: theme.weatherEnabled ?? false,
      weatherLocation: theme.weatherLocation?.trim() || "",
    });
  }, [theme, isDirty]);

  const markDirty = () => setIsDirty(true);

  const handleColorChange = (key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleBrandWordColorChange = (key: BrandWordColorKey, value: string) => {
    setBrandWordColors((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleBrandingChange = (key: keyof BrandingFields, value: string | number | boolean) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleWeatherChange = (key: keyof WeatherFields, value: boolean | string) => {
    setWeatherSettings((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleSave = async () => {
    try {
      const updated = await updateTheme.mutateAsync({
        data: {
          primaryColor: colors.primaryColor || undefined,
          accentColor: colors.accentColor || undefined,
          backgroundColor: colors.backgroundColor || undefined,
          buttonColor: colors.buttonColor || undefined,
          headingColor: colors.headingColor || undefined,
          brandPrefixColor: brandWordColors.brandPrefixColor.trim(),
          brandTownColor: brandWordColors.brandTownColor.trim(),
          brandHubColor: brandWordColors.brandHubColor.trim(),
          ...buildBrandingPayload(branding),
          weatherEnabled: weatherSettings.weatherEnabled,
          weatherLocation: weatherSettings.weatherLocation.trim(),
        },
      });
      queryClient.setQueryData(getGetPlatformThemeQueryKey(), updated);
      await queryClient.invalidateQueries({ queryKey: getGetPlatformThemeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetWeatherQueryKey() });
      lastSyncAt.current = updated.updatedAt ?? null;
      setColors({
        primaryColor: updated.primaryColor || COLOR_DEFAULTS.primaryColor,
        accentColor: updated.accentColor || COLOR_DEFAULTS.accentColor,
        backgroundColor: updated.backgroundColor || COLOR_DEFAULTS.backgroundColor,
        buttonColor: updated.buttonColor || COLOR_DEFAULTS.buttonColor,
        headingColor: updated.headingColor || "",
      });
      setBrandWordColors({
        brandPrefixColor: updated.brandPrefixColor || "",
        brandTownColor: updated.brandTownColor || "",
        brandHubColor: updated.brandHubColor || "",
      });
      setBranding(themeToBrandingFields(updated));
      setWeatherSettings({
        weatherEnabled: updated.weatherEnabled ?? false,
        weatherLocation: updated.weatherLocation?.trim() || "",
      });
      setIsDirty(false);
      toast({ title: "Settings saved", description: "Platform appearance updated across web and iOS." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const handleResetAll = () => {
    setColors(COLOR_DEFAULTS);
    setBrandWordColors(BRAND_WORD_COLOR_DEFAULTS);
    setBranding(BRANDING_DEFAULTS);
    setWeatherSettings(WEATHER_DEFAULTS);
    markDirty();
  };

  const brandParts = splitPlatformBrandName(branding.platformName.trim() || DEFAULT_PLATFORM_NAME);
  const prefixLabel = brandParts.prefix.trim() || "Prefix";
  const townLabel = brandParts.town || "Town";
  const hubLabel = brandParts.hub || "Hub";

  return (
    <AdminDashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 pb-28">
        <DashboardPageHeader
          title="Platform Settings"
          description="Identity, homepage hero, colors, and weather — one save updates the marketplace on web and iOS."
          action={
            <div className="flex items-center gap-2">
              {!isDirty ? (
                <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Saved
                </span>
              ) : null}
              <LoadingButton
                onClick={handleSave}
                disabled={!isDirty}
                loading={updateTheme.isPending}
                loadingText="Saving…"
                className="rounded-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </LoadingButton>
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-[1.75rem] bg-muted/60" />
            <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted/60" />
          </div>
        ) : (
          <>
            <SettingsSection
              icon={Type}
              title="Identity"
              description="Name and logo shown in the header, footer, browser tab, and setup screens."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="platformName">Platform name</Label>
                  <Input
                    id="platformName"
                    value={branding.platformName}
                    onChange={(e) => handleBrandingChange("platformName", e.target.value)}
                    placeholder="Clay TownHub"
                  />
                  <p className="text-xs text-muted-foreground">
                    Names ending in TownHub (e.g. Clay TownHub) get a three-color wordmark below.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-medium">Wordmark colors</p>
                  <p className="text-xs text-muted-foreground">
                    Separate colors for each part of the name in the header and footer. Leave blank for defaults
                    (muted / brand / heading).
                  </p>
                  <div className="mt-3 grid gap-5 md:grid-cols-3">
                    <ColorPickerField
                      id="brandPrefixColor"
                      label={`${prefixLabel} color`}
                      description="First word (e.g. Clay)"
                      value={brandWordColors.brandPrefixColor}
                      onChange={(value) => handleBrandWordColorChange("brandPrefixColor", value)}
                      placeholder="#64748B"
                    />
                    <ColorPickerField
                      id="brandTownColor"
                      label={`${townLabel} color`}
                      description="Middle word"
                      value={brandWordColors.brandTownColor}
                      onChange={(value) => handleBrandWordColorChange("brandTownColor", value)}
                      placeholder={PLATFORM_THEME_DEFAULTS.primaryColor}
                    />
                    <ColorPickerField
                      id="brandHubColor"
                      label={`${hubLabel} color`}
                      description="Last word"
                      value={brandWordColors.brandHubColor}
                      onChange={(value) => handleBrandWordColorChange("brandHubColor", value)}
                      placeholder="#0F172A"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="townName">Town name</Label>
                  <Input
                    id="townName"
                    value={branding.townName}
                    onChange={(e) => handleBrandingChange("townName", e.target.value)}
                    placeholder="Clay"
                  />
                  <p className="text-xs text-muted-foreground">
                    Personalizes the shop button and default footer copy.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={branding.tagline}
                    onChange={(e) => handleBrandingChange("tagline", e.target.value)}
                    placeholder="Order Local. Support Local."
                  />
                  <p className="text-xs text-muted-foreground">
                    Footer and SEO description — not the homepage hero.
                  </p>
                </div>
                <ImageField
                  surface="platform-logo"
                  label="Logo"
                  value={branding.logoUrl}
                  onChange={(logoUrl) => handleBrandingChange("logoUrl", logoUrl)}
                  testId="platform-logo"
                />
                <div className="space-y-2">
                  <Label htmlFor="logoSizePx">Web logo size</Label>
                  <Select
                    value={String(branding.logoSizePx)}
                    onValueChange={(value) => handleBrandingChange("logoSizePx", parseInt(value, 10))}
                  >
                    <SelectTrigger id="logoSizePx">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {logoSizeOptions(branding.logoSizePx).map(({ value, label }) => (
                        <SelectItem key={value} value={String(value)}>
                          {label}
                          {value === DEFAULT_LOGO_SIZE_PX ? " (default)" : ""}
                          {" — "}
                          {value}px
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Web header and footer only. The iOS app uses a fixed compact size.
                  </p>
                </div>
              </div>

              {(branding.logoUrl || branding.platformName || branding.townName) && (
                <div className="rounded-2xl bg-muted/35 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Preview
                  </p>
                  <div className="flex items-center gap-2">
                    {branding.logoUrl ? (
                      <img
                        src={branding.logoUrl}
                        alt=""
                        className="shrink-0 rounded object-contain"
                        style={{ width: branding.logoSizePx, height: branding.logoSizePx }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="flex shrink-0 items-center justify-center rounded bg-primary/10 text-xs text-primary"
                        style={{ width: branding.logoSizePx, height: branding.logoSizePx }}
                      >
                        Logo
                      </div>
                    )}
                    <PlatformBrandMark
                      name={branding.platformName.trim() || DEFAULT_PLATFORM_NAME}
                      className="text-lg"
                      colors={{
                        prefix: brandWordColors.brandPrefixColor || null,
                        town: brandWordColors.brandTownColor || null,
                        hub: brandWordColors.brandHubColor || null,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {resolveTagline({
                      tagline: branding.tagline || null,
                      townName: branding.townName || null,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Footer:{" "}
                    {resolveFooterTagline({
                      tagline: branding.tagline || null,
                      townName: branding.townName || null,
                    })}
                  </p>
                </div>
              )}
            </SettingsSection>

            <SettingsSection
              icon={ImageIcon}
              title="Homepage hero"
              description="Background image, optional logo overlay, and call-to-action buttons on the marketplace home."
            >
              <ImageField
                surface="homepage-hero"
                value={branding.heroImageUrl}
                onChange={(heroImageUrl) => handleBrandingChange("heroImageUrl", heroImageUrl)}
                testId="homepage-hero"
              />
              <p className="text-xs text-muted-foreground -mt-3">
                Recommended 1920 × 800 px. Fill mode may crop on smaller screens.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="heroImageFit">Image fit</Label>
                  <Select
                    value={branding.heroImageFit}
                    onValueChange={(value) =>
                      handleBrandingChange("heroImageFit", value as HeroImageFit)
                    }
                  >
                    <SelectTrigger id="heroImageFit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_IMAGE_FIT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {heroImageFitHelperText(branding.heroImageFit)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroImagePosition">Image position</Label>
                  <Select
                    value={branding.heroImagePosition}
                    onValueChange={(value) =>
                      handleBrandingChange("heroImagePosition", value as HeroImagePosition)
                    }
                  >
                    <SelectTrigger id="heroImagePosition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_IMAGE_POSITION_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <ImageField
                surface="homepage-hero-overlay"
                label="Overlay image (logo + text)"
                value={branding.heroOverlayImageUrl}
                onChange={(url) => handleBrandingChange("heroOverlayImageUrl", url)}
                testId="homepage-hero-overlay"
              />
              <p className="text-xs text-muted-foreground -mt-3">
                Optional transparent PNG. Sits on the background and is never cropped.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="heroOverlaySize">Overlay size</Label>
                  <Select
                    value={branding.heroOverlaySize}
                    onValueChange={(value) =>
                      handleBrandingChange("heroOverlaySize", value as HeroOverlaySize)
                    }
                  >
                    <SelectTrigger id="heroOverlaySize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_OVERLAY_SIZE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroOverlayAlign">Overlay alignment</Label>
                  <Select
                    value={branding.heroOverlayAlign}
                    onValueChange={(value) =>
                      handleBrandingChange("heroOverlayAlign", value as HeroOverlayAlign)
                    }
                  >
                    <SelectTrigger id="heroOverlayAlign">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_OVERLAY_ALIGN_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SettingsToggleRow
                  label="Shop button"
                  description="Links to the marketplace directory."
                  checked={branding.showShopButton}
                  onCheckedChange={(value) => handleBrandingChange("showShopButton", value)}
                />
                <SettingsToggleRow
                  label="List Your Business"
                  description="Invites owners to apply."
                  checked={branding.showListBusinessButton}
                  onCheckedChange={(value) => handleBrandingChange("showListBusinessButton", value)}
                />
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="heroButtonPlacement">Button placement</Label>
                <Select
                  value={branding.heroButtonPlacement}
                  onValueChange={(value) =>
                    handleBrandingChange("heroButtonPlacement", value as HeroButtonPlacement)
                  }
                >
                  <SelectTrigger id="heroButtonPlacement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HERO_BUTTON_PLACEMENT_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {branding.heroImageUrl || branding.heroOverlayImageUrl ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Live preview</p>
                  <HeroPreviewFrame
                    heroImageUrl={branding.heroImageUrl || null}
                    heroOverlayImageUrl={branding.heroOverlayImageUrl || null}
                    heroImageFit={branding.heroImageFit}
                    heroImagePosition={branding.heroImagePosition}
                    heroOverlaySize={branding.heroOverlaySize}
                    heroOverlayAlign={branding.heroOverlayAlign}
                    heroButtonPlacement={branding.heroButtonPlacement}
                    buttons={
                      branding.showShopButton || branding.showListBusinessButton ? (
                        <>
                          {branding.showShopButton ? (
                            <span className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-slate-900 shadow-xl ring-1 ring-black/5">
                              {resolveShopCtaLabel({ townName: branding.townName || null })}
                            </span>
                          ) : null}
                          {branding.showListBusinessButton ? (
                            <span className="inline-flex items-center rounded-full border-2 bg-white/90 px-6 py-2.5 text-sm font-semibold text-foreground shadow-lg">
                              List Your Business
                            </span>
                          ) : null}
                        </>
                      ) : null
                    }
                  />
                </div>
              ) : null}
            </SettingsSection>

            <SettingsSection
              icon={Palette}
              title="Colors"
              description="Marketplace theme on public pages. Business storefronts can override accent and button colors."
            >
              <div className="grid gap-6 md:grid-cols-2">
                {COLOR_FIELDS.map(({ key, label, description }) => (
                  <ColorPickerField
                    key={key}
                    id={key}
                    label={label}
                    description={description}
                    value={colors[key]}
                    onChange={(value) => handleColorChange(key, value)}
                  />
                ))}
              </div>
              <ColorPreviewSwatches
                items={COLOR_FIELDS.filter((f) => colors[f.key]).map(({ key, label }) => ({
                  key,
                  label: label.split(" ")[0],
                  value: colors[key],
                }))}
              />
            </SettingsSection>

            <SettingsSection
              icon={CloudSun}
              title="Weather"
              description="Optional current conditions and 5-day forecast on the homepage (Open-Meteo)."
            >
              <SettingsToggleRow
                label="Show weather on homepage"
                description="When off, the widget is hidden on web and iOS."
                checked={weatherSettings.weatherEnabled}
                onCheckedChange={(value) => handleWeatherChange("weatherEnabled", value)}
              />
              <div className="space-y-2">
                <Label htmlFor="weatherLocation">Location</Label>
                <Input
                  id="weatherLocation"
                  value={weatherSettings.weatherLocation}
                  onChange={(e) => handleWeatherChange("weatherLocation", e.target.value)}
                  placeholder={theme?.townName?.trim() || "Clay, Alabama"}
                  disabled={!weatherSettings.weatherEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  City name, optionally with state. Falls back to town name when blank.
                </p>
              </div>
              {weatherSettings.weatherEnabled ? (
                <p className="rounded-2xl bg-muted/35 px-3 py-2.5 text-sm text-muted-foreground">
                  Preview:{" "}
                  <span className="font-medium text-foreground">
                    {resolveWeatherLocation({
                      weatherLocation: weatherSettings.weatherLocation || null,
                      townName: theme?.townName ?? null,
                    }) || "Set a location to show weather"}
                  </span>
                </p>
              ) : null}
            </SettingsSection>
          </>
        )}

        {isDirty ? (
          <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[1.25rem] border-0 bg-card/95 px-4 py-3 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md md:left-auto md:right-10">
            <p className="text-sm text-muted-foreground">Unsaved changes</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={handleResetAll}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
              <LoadingButton
                size="sm"
                onClick={handleSave}
                loading={updateTheme.isPending}
                loadingText="Saving…"
                className="rounded-full"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save all
              </LoadingButton>
            </div>
          </div>
        ) : null}
      </div>
    </AdminDashboardLayout>
  );
}
