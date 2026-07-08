import { useState, useEffect, useRef } from "react";
import {
  useGetPlatformTheme,
  useUpdatePlatformTheme,
  getGetPlatformThemeQueryKey,
  getGetWeatherQueryKey,
} from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, Save, RotateCcw, CheckCircle, Type, CloudSun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { ImageField } from "@/components/image-field";
import { HeroPreviewFrame } from "@/components/hero-preview-frame";
import { PLATFORM_THEME_DEFAULTS } from "@/lib/theme-colors";

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

const DEFAULTS: Record<ColorKey, string> = {
  primaryColor: PLATFORM_THEME_DEFAULTS.primaryColor,
  accentColor: PLATFORM_THEME_DEFAULTS.accentColor,
  backgroundColor: PLATFORM_THEME_DEFAULTS.backgroundColor,
  buttonColor: PLATFORM_THEME_DEFAULTS.buttonColor,
  headingColor: "",
};

type ColorKey = "primaryColor" | "accentColor" | "backgroundColor" | "buttonColor" | "headingColor";

const COLOR_FIELDS: Array<{ key: ColorKey; label: string; description: string }> = [
  { key: "primaryColor", label: "Primary Color", description: "Main brand color — buttons, links, active states" },
  { key: "accentColor", label: "Accent / Gold", description: "Secondary highlight color — badges, promotions" },
  { key: "backgroundColor", label: "Background Color", description: "Page background across public marketplace" },
  { key: "buttonColor", label: "Button Color", description: "CTA button override (if different from primary)" },
  { key: "headingColor", label: "Heading Color", description: "Optional — overrides heading text color" },
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

  const [colors, setColors] = useState(DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);
  const [branding, setBranding] = useState<BrandingFields>(BRANDING_DEFAULTS);
  const [isBrandingDirty, setIsBrandingDirty] = useState(false);
  const [weatherSettings, setWeatherSettings] = useState<WeatherFields>(WEATHER_DEFAULTS);
  const [isWeatherDirty, setIsWeatherDirty] = useState(false);
  const lastBrandingSyncAt = useRef<string | null>(null);

  useEffect(() => {
    if (!theme) return;
    setColors({
      primaryColor: theme.primaryColor || DEFAULTS.primaryColor,
      accentColor: theme.accentColor || DEFAULTS.accentColor,
      backgroundColor: theme.backgroundColor || DEFAULTS.backgroundColor,
      buttonColor: theme.buttonColor || DEFAULTS.buttonColor,
      headingColor: theme.headingColor || "",
    });
    if (!isBrandingDirty && theme.updatedAt && theme.updatedAt !== lastBrandingSyncAt.current) {
      lastBrandingSyncAt.current = theme.updatedAt;
      setBranding(themeToBrandingFields(theme));
    }
    if (!isWeatherDirty) {
      setWeatherSettings({
        weatherEnabled: theme.weatherEnabled ?? false,
        weatherLocation: theme.weatherLocation?.trim() || "",
      });
    }
  }, [theme, isBrandingDirty, isWeatherDirty]);

  const handleChange = (key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
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
        },
      });
      queryClient.setQueryData(getGetPlatformThemeQueryKey(), updated);
      await queryClient.invalidateQueries({ queryKey: getGetPlatformThemeQueryKey() });
      setIsDirty(false);
      toast({ title: "Theme saved", description: "Platform theme updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to save theme.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setColors(DEFAULTS);
    setIsDirty(true);
  };

  const handleBrandingChange = (key: keyof BrandingFields, value: string | number | boolean) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
    setIsBrandingDirty(true);
  };

  const handleBrandingSave = async () => {
    try {
      const updated = await updateTheme.mutateAsync({
        data: buildBrandingPayload(branding),
      });
      queryClient.setQueryData(getGetPlatformThemeQueryKey(), updated);
      await queryClient.invalidateQueries({ queryKey: getGetPlatformThemeQueryKey() });
      lastBrandingSyncAt.current = updated.updatedAt ?? null;
      setBranding(themeToBrandingFields(updated));
      setIsBrandingDirty(false);
      toast({ title: "Branding saved", description: "Platform name and copy updated across the site." });
    } catch {
      toast({ title: "Error", description: "Failed to save branding.", variant: "destructive" });
    }
  };

  const handleBrandingReset = () => {
    setBranding(BRANDING_DEFAULTS);
    setIsBrandingDirty(true);
  };

  const handleWeatherChange = (key: keyof WeatherFields, value: boolean | string) => {
    setWeatherSettings((prev) => ({ ...prev, [key]: value }));
    setIsWeatherDirty(true);
  };

  const handleWeatherSave = async () => {
    try {
      const updated = await updateTheme.mutateAsync({
        data: {
          weatherEnabled: weatherSettings.weatherEnabled,
          weatherLocation: weatherSettings.weatherLocation.trim(),
        },
      });
      queryClient.setQueryData(getGetPlatformThemeQueryKey(), updated);
      await queryClient.invalidateQueries({ queryKey: getGetPlatformThemeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetWeatherQueryKey() });
      setWeatherSettings({
        weatherEnabled: updated.weatherEnabled ?? false,
        weatherLocation: updated.weatherLocation?.trim() || "",
      });
      setIsWeatherDirty(false);
      toast({ title: "Weather settings saved", description: "Homepage weather widget updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save weather settings.", variant: "destructive" });
    }
  };

  const handleWeatherReset = () => {
    setWeatherSettings(WEATHER_DEFAULTS);
    setIsWeatherDirty(true);
  };

  return (
    <AdminDashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">Platform Settings</h1>
          <p className="text-muted-foreground">Control the marketplace appearance, branding, and weather widget.</p>
        </div>

        {/* Theme Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Marketplace Theme</CardTitle>
            </div>
            <CardDescription>
              These colors apply across all public marketplace pages. Individual business storefronts can
              override accent and button colors in their own settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 animate-pulse bg-muted rounded-lg" />
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {COLOR_FIELDS.map(({ key, label, description }) => (
                    <ColorPickerField
                      key={key}
                      id={key}
                      label={label}
                      description={description}
                      value={colors[key]}
                      onChange={(value) => handleChange(key, value)}
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

                <Separator />

                <div className="flex items-center gap-3">
                  <LoadingButton
                    onClick={handleSave}
                    disabled={!isDirty}
                    loading={updateTheme.isPending}
                    loadingText="Saving…"
                    className="rounded-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Theme
                  </LoadingButton>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="rounded-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  {!isDirty && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Saved
                    </span>
                  )}
                </div>

                <div className="bg-muted/40 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Clay-inspired defaults</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                    <span>Primary blue: #1E3A8A</span>
                    <span>Gold accent: #F59E0B</span>
                    <span>Dark navy: #0F172A</span>
                    <span>Light bg: #F8FAFC</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Platform Branding</CardTitle>
            </div>
            <CardDescription>
              Build the homepage hero from a background image and an optional logo/text overlay, then
              choose which call-to-action buttons appear. Site name, logo, and tagline are below.
              Leave fields blank to use defaults.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 animate-pulse bg-muted rounded-lg" />
            ) : (
              <div className="space-y-6">
                <ImageField
                  surface="homepage-hero"
                  value={branding.heroImageUrl}
                  onChange={(heroImageUrl) => handleBrandingChange("heroImageUrl", heroImageUrl)}
                  testId="homepage-hero"
                />
                <p className="text-xs text-muted-foreground -mt-4">
                  Recommended: 1920 × 800 px (wide banner). Recommended size helps image quality, but
                  Fill banner can still crop depending on screen size.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heroImageFit">Hero image fit</Label>
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
                    <Label htmlFor="heroImagePosition">Hero image position</Label>
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
                <ImageField
                  surface="homepage-hero-overlay"
                  label="Hero overlay image (logo + text)"
                  value={branding.heroOverlayImageUrl}
                  onChange={(url) => handleBrandingChange("heroOverlayImageUrl", url)}
                  testId="homepage-hero-overlay"
                />
                <p className="text-xs text-muted-foreground -mt-4">
                  Optional transparent PNG combining your logo, town name, and tagline. It sits on
                  top of the background and is never cropped. Leave blank to show only the background.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
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
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">Shop button</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Links visitors to the marketplace.
                      </p>
                    </div>
                    <Switch
                      checked={branding.showShopButton}
                      onCheckedChange={(value) => handleBrandingChange("showShopButton", value)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">List Your Business button</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invites owners to join the platform.
                      </p>
                    </div>
                    <Switch
                      checked={branding.showListBusinessButton}
                      onCheckedChange={(value) =>
                        handleBrandingChange("showListBusinessButton", value)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 md:max-w-xs">
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
                    <p className="text-xs text-muted-foreground">
                      Live preview — matches the homepage hero crop and layout.
                    </p>
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
                <Separator />
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      value={branding.platformName}
                      onChange={(e) => handleBrandingChange("platformName", e.target.value)}
                      placeholder={DEFAULT_PLATFORM_NAME}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in the header, footer, browser tab, and setup pages (e.g. Clay LocalOrderHub).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="townName">Town Name</Label>
                    <Input
                      id="townName"
                      value={branding.townName}
                      onChange={(e) => handleBrandingChange("townName", e.target.value)}
                      placeholder="Clay"
                    />
                    <p className="text-xs text-muted-foreground">
                      Personalizes the shop button, tagline, and footer defaults.
                    </p>
                  </div>
                  <ImageField
                    surface="platform-logo"
                    label="Platform logo"
                    value={branding.logoUrl}
                    onChange={(logoUrl) => handleBrandingChange("logoUrl", logoUrl)}
                    testId="platform-logo"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="logoSizePx">Logo size</Label>
                    <Select
                      value={String(branding.logoSizePx)}
                      onValueChange={(value) => {
                        setBranding((prev) => ({ ...prev, logoSizePx: parseInt(value, 10) }));
                        setIsBrandingDirty(true);
                      }}
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
                      Header and footer logo size. Logo aspect ratio is preserved.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={branding.tagline}
                      onChange={(e) => handleBrandingChange("tagline", e.target.value)}
                      placeholder="Order Local. Support Local. The digital heart of your small town."
                    />
                    <p className="text-xs text-muted-foreground">
                      Homepage hero and footer copy. Overrides the town-based default when set.
                    </p>
                  </div>
                </div>

                {(branding.logoUrl || branding.platformName || branding.townName) && (
                  <div className="rounded-lg border border-border p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-3">Preview</p>
                    <div className="flex items-center gap-2">
                      {branding.logoUrl ? (
                        <img
                          src={branding.logoUrl}
                          alt=""
                          className="object-contain rounded shrink-0"
                          style={{ width: branding.logoSizePx, height: branding.logoSizePx }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div
                          className="rounded bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0"
                          style={{ width: branding.logoSizePx, height: branding.logoSizePx }}
                        >
                          Logo
                        </div>
                      )}
                      <span className="font-serif text-lg font-semibold text-primary">
                        {branding.platformName.trim() || DEFAULT_PLATFORM_NAME}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      {resolveTagline({ tagline: branding.tagline || null, townName: branding.townName || null })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Footer: {resolveFooterTagline({ tagline: branding.tagline || null, townName: branding.townName || null })}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <LoadingButton
                    onClick={handleBrandingSave}
                    disabled={!isBrandingDirty}
                    loading={updateTheme.isPending}
                    loadingText="Saving…"
                    className="rounded-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Branding
                  </LoadingButton>
                  <Button variant="outline" onClick={handleBrandingReset} className="rounded-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  {!isBrandingDirty && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Saved
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weather Widget */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Homepage Weather</CardTitle>
            </div>
            <CardDescription>
              Show a compact current-conditions and 5-day forecast on the homepage. Uses Open-Meteo (no API key required).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">Enable weather widget</p>
                    <p className="text-sm text-muted-foreground">
                      When off, the homepage hides weather entirely.
                    </p>
                  </div>
                  <Switch
                    checked={weatherSettings.weatherEnabled}
                    onCheckedChange={(value) => handleWeatherChange("weatherEnabled", value)}
                  />
                </div>
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
                    City name, optionally with state (e.g. &quot;Sandpoint&quot; or &quot;Charleston, WV&quot;).
                    Falls back to the platform town name when blank.
                    {theme?.townName ? ` Current town: ${theme.townName}.` : ""}
                  </p>
                </div>
                {weatherSettings.weatherEnabled && (
                  <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 border border-border/60 px-3 py-2">
                    Preview location:{" "}
                    <span className="font-medium text-foreground">
                      {resolveWeatherLocation({
                        weatherLocation: weatherSettings.weatherLocation || null,
                        townName: theme?.townName ?? null,
                      }) || "Set a location to show weather"}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <LoadingButton
                    onClick={handleWeatherSave}
                    disabled={!isWeatherDirty}
                    loading={updateTheme.isPending}
                    loadingText="Saving…"
                    className="rounded-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Weather Settings
                  </LoadingButton>
                  <Button variant="outline" onClick={handleWeatherReset} className="rounded-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  {!isWeatherDirty && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Saved
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
