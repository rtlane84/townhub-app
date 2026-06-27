import { useState, useEffect, useRef } from "react";
import {
  useGetPlatformTheme,
  useUpdatePlatformTheme,
  useListNotificationLogs,
  getGetPlatformThemeQueryKey,
} from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, Save, RotateCcw, Bell, CheckCircle, AlertCircle, Clock, Type } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { ImageField } from "@/components/image-field";
import { PLATFORM_THEME_DEFAULTS } from "@/lib/theme-colors";

import {
  DEFAULT_HERO_BUTTON_COLOR,
  DEFAULT_HERO_HEADLINE_LINE1,
  DEFAULT_HERO_HEADLINE_LINE2,
  DEFAULT_HERO_OVERLAY_COLOR,
  DEFAULT_HERO_OVERLAY_OPACITY,
  DEFAULT_PLATFORM_NAME,
  buildBrandingPayload,
  DEFAULT_LOGO_SIZE_PX,
  heroOverlayBackgroundStyle,
  heroPrimaryButtonStyle,
  LOGO_SIZE_OPTIONS,
  resolveFooterTagline,
  resolveHeroHeadline,
  resolveShopCtaLabel,
  resolveTagline,
  themeToBrandingFields,
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

type BrandingFields = {
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
};

const BRANDING_DEFAULTS: BrandingFields = {
  platformName: DEFAULT_PLATFORM_NAME,
  townName: "",
  tagline: "",
  logoUrl: "",
  heroImageUrl: "",
  heroOverlayColor: DEFAULT_HERO_OVERLAY_COLOR,
  heroOverlayOpacity: DEFAULT_HERO_OVERLAY_OPACITY,
  heroButtonColor: DEFAULT_HERO_BUTTON_COLOR,
  heroHeadlineAccentColor: PLATFORM_THEME_DEFAULTS.primaryColor,
  heroHeadlineLine1: "",
  heroHeadlineLine2: "",
  logoSizePx: DEFAULT_LOGO_SIZE_PX,
};

function brandingHeadlinePreview(branding: BrandingFields) {
  return resolveHeroHeadline({
    heroHeadlineLine1: branding.heroHeadlineLine1 || null,
    heroHeadlineLine2: branding.heroHeadlineLine2 || null,
  });
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
  const lastBrandingSyncAt = useRef<string | null>(null);

  const { data: notifLogs = [] } = useListNotificationLogs({}, {
    query: { queryKey: ["/api/admin/notification-logs"] },
  });

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
  }, [theme, isBrandingDirty]);

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

  const handleBrandingChange = (key: keyof BrandingFields, value: string | number) => {
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

  return (
    <AdminDashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">Platform Settings</h1>
          <p className="text-muted-foreground">Control the marketplace appearance and inspect notification logs.</p>
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
                  <Button
                    onClick={handleSave}
                    disabled={!isDirty || updateTheme.isPending}
                    className="rounded-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateTheme.isPending ? "Saving…" : "Save Theme"}
                  </Button>
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
              Customize how the marketplace appears to visitors — homepage hero, site name, tagline, and logo.
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
                <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div>
                    <p className="text-sm font-medium">Hero overlay</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tint over the homepage hero image so headline text and buttons stay readable.
                      Applies when a hero image is set.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <ColorPickerField
                      id="heroOverlayColor"
                      label="Overlay color"
                      description="Usually black or a dark brand color."
                      value={branding.heroOverlayColor}
                      onChange={(value) => handleBrandingChange("heroOverlayColor", value)}
                    />
                    <div className="space-y-3">
                      <Label htmlFor="heroOverlayOpacity">Overlay opacity</Label>
                      <Slider
                        id="heroOverlayOpacity"
                        value={[branding.heroOverlayOpacity]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([value]) =>
                          handleBrandingChange("heroOverlayOpacity", value ?? DEFAULT_HERO_OVERLAY_OPACITY)
                        }
                      />
                      <p className="text-xs text-muted-foreground">{branding.heroOverlayOpacity}%</p>
                    </div>
                    <ColorPickerField
                      id="heroButtonColor"
                      label="Primary button color"
                      description="Shop button on the homepage hero. Text color adjusts automatically."
                      value={branding.heroButtonColor}
                      onChange={(value) => handleBrandingChange("heroButtonColor", value)}
                    />
                    <ColorPickerField
                      id="heroHeadlineAccentColor"
                      label="Headline accent (line 2)"
                      description="Accent color for the second headline line. Works with or without a hero image."
                      value={branding.heroHeadlineAccentColor}
                      onChange={(value) => handleBrandingChange("heroHeadlineAccentColor", value)}
                    />
                  </div>
                  {branding.heroImageUrl ? (
                    <div className="relative aspect-[21/9] overflow-hidden rounded-lg border">
                      <img
                        src={branding.heroImageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        aria-hidden
                      />
                      <div
                        className="absolute inset-0"
                        style={heroOverlayBackgroundStyle(
                          branding.heroOverlayColor,
                          branding.heroOverlayOpacity,
                        )}
                        aria-hidden
                      />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-6">
                        <p className="text-center font-serif text-lg font-semibold text-white drop-shadow-sm">
                          {brandingHeadlinePreview(branding).line1}{" "}
                          <span style={{ color: branding.heroHeadlineAccentColor }}>
                            {brandingHeadlinePreview(branding).line2}
                          </span>
                        </p>
                        <span
                          className="inline-flex items-center rounded-full px-8 py-3 text-sm font-semibold shadow-lg"
                          style={heroPrimaryButtonStyle(branding.heroButtonColor)}
                        >
                          {resolveShopCtaLabel({ townName: branding.townName || null })}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="heroHeadlineLine1">Hero headline — line 1</Label>
                    <Input
                      id="heroHeadlineLine1"
                      value={branding.heroHeadlineLine1}
                      onChange={(e) => handleBrandingChange("heroHeadlineLine1", e.target.value)}
                      placeholder={DEFAULT_HERO_HEADLINE_LINE1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroHeadlineLine2">Hero headline — line 2</Label>
                    <Input
                      id="heroHeadlineLine2"
                      value={branding.heroHeadlineLine2}
                      onChange={(e) => handleBrandingChange("heroHeadlineLine2", e.target.value)}
                      placeholder={DEFAULT_HERO_HEADLINE_LINE2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in the accent color. Leave blank for the default headline.
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
                    <Label htmlFor="logoSizePx">Logo Size</Label>
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
                        {LOGO_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}px {size === DEFAULT_LOGO_SIZE_PX ? "(default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Header and footer logo height/width in pixels.
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
                    <p className="text-sm font-serif font-semibold mt-4">
                      {brandingHeadlinePreview(branding).line1}{" "}
                      <span style={{ color: branding.heroHeadlineAccentColor }}>
                        {brandingHeadlinePreview(branding).line2}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {resolveTagline({ tagline: branding.tagline || null, townName: branding.townName || null })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Footer: {resolveFooterTagline({ tagline: branding.tagline || null, townName: branding.townName || null })}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleBrandingSave}
                    disabled={!isBrandingDirty || updateTheme.isPending}
                    className="rounded-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateTheme.isPending ? "Saving…" : "Save Branding"}
                  </Button>
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

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Notification Log</CardTitle>
            </div>
            <CardDescription>
              Owner and customer notifications (sent, logged, or failed). When no provider is configured,
              notifications are logged here instead of delivered. Email:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code> or{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SMTP_*</code>. SMS:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">TWILIO_*</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet. Place a test order to see logs here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {notifLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 text-sm space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={log.status === "SENT" ? "default" : log.status === "FAILED" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {log.status === "SENT" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : log.status === "FAILED" ? (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {log.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">
                          {(log.eventType ?? log.type ?? "UNKNOWN").replace(/_/g, " ")}
                        </Badge>
                        {log.channel && (
                          <Badge variant="outline" className="text-xs">
                            {log.channel}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {log.orderId != null && `Order #${log.orderId}`}
                        {log.appointmentRequestId != null && `Appt #${log.appointmentRequestId}`}
                        {(log.orderId != null || log.appointmentRequestId != null) && " · "}
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      {log.subject && <span className="font-medium">{log.subject}</span>}
                      {(log.recipientEmail || log.recipientPhone) && (
                        <span className="text-muted-foreground">
                          {log.subject ? " → " : ""}
                          {log.recipientEmail ?? log.recipientPhone}
                        </span>
                      )}
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-destructive">{log.errorMessage}</p>
                    )}
                    <pre className="text-xs bg-muted/50 rounded p-2 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {log.body}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
