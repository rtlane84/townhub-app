import { useState, useEffect } from "react";
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
import { Palette, Save, RotateCcw, Bell, CheckCircle, AlertCircle, Clock } from "lucide-react";

const DEFAULTS = {
  primaryColor: "#1E3A8A",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  buttonColor: "#1E3A8A",
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

export default function AdminSettings() {
  const { data: theme, isLoading } = useGetPlatformTheme();
  const updateTheme = useUpdatePlatformTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [colors, setColors] = useState(DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);

  const { data: notifLogs = [] } = useListNotificationLogs({}, {
    query: { queryKey: ["/api/admin/notification-logs"] },
  });

  useEffect(() => {
    if (theme) {
      setColors({
        primaryColor: theme.primaryColor || DEFAULTS.primaryColor,
        accentColor: theme.accentColor || DEFAULTS.accentColor,
        backgroundColor: theme.backgroundColor || DEFAULTS.backgroundColor,
        buttonColor: theme.buttonColor || DEFAULTS.buttonColor,
        headingColor: theme.headingColor || "",
      });
    }
  }, [theme]);

  const handleChange = (key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateTheme.mutateAsync({
        data: {
          primaryColor: colors.primaryColor || undefined,
          accentColor: colors.accentColor || undefined,
          backgroundColor: colors.backgroundColor || undefined,
          buttonColor: colors.buttonColor || undefined,
          headingColor: colors.headingColor || undefined,
        },
      });
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
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0"
                          style={{ backgroundColor: colors[key] || "transparent" }}
                        />
                        <div className="flex-1">
                          <Input
                            id={key}
                            type="color"
                            value={colors[key] || "#ffffff"}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="h-10 p-1 cursor-pointer"
                          />
                        </div>
                        <Input
                          type="text"
                          value={colors[key]}
                          onChange={(e) => handleChange(key, e.target.value)}
                          placeholder="#000000"
                          className="w-28 font-mono text-sm"
                          maxLength={7}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  ))}
                </div>

                {/* Preview swatches */}
                <div>
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <div className="flex gap-3 flex-wrap">
                    {COLOR_FIELDS.filter((f) => colors[f.key]).map(({ key, label }) => (
                      <div key={key} className="text-center">
                        <div
                          className="w-12 h-12 rounded-xl border border-border shadow-sm mb-1"
                          style={{ backgroundColor: colors[key] }}
                        />
                        <p className="text-xs text-muted-foreground">{label.split(" ")[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>

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

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Notification Log</CardTitle>
            </div>
            <CardDescription>
              All order notifications (sent or logged). When no email provider is configured,
              notifications are logged here instead of emailed. Wire up{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code> or{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">SMTP_HOST</code> to enable
              real email delivery.
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
                          {log.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Order #{log.orderId} · {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">{log.subject}</span>
                      <span className="text-muted-foreground"> → {log.recipientEmail}</span>
                    </div>
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
