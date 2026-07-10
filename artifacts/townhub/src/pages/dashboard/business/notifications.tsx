import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useTestBusinessNotificationEmail,
  useTestBusinessNotificationSms,
  useTestBusinessNotificationDiscord,
  useTestBusinessNotificationNtfy,
  useRegenerateBusinessNtfyTopic,
  useUpdateBusiness,
  getGetMyBusinessQueryKey,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { acceptsAppointmentRequests } from "@workspace/api-zod";
import { Volume2, Mail, MessageSquare, Hash, Smartphone, Copy, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  NotificationProviderCard,
  ProviderActionButtons,
  ProviderConnectionStatus,
  ProviderEnableRow,
  ProviderSetupInstructions,
} from "@/components/notifications/notification-provider-ui";
import { UserNotificationPreferencesPanel } from "@/components/notifications/user-notification-preferences-panel";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  subscribeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { playNotificationSound, unlockNotificationSound } from "@/lib/notification-sounds";
import {
  deliveryFormFromBusiness,
  isDiscordSettingsDirty,
  isEmailSettingsDirty,
  isSmsSettingsDirty,
  UNSAVED_SETTINGS_TEST_HINT,
  type NotificationDeliveryForm,
} from "@/lib/notification-settings-form";
import {
  getProviderTestSnapshot,
  recordProviderTestFailure,
  recordProviderTestSuccess,
  resolveConnectionDisplay,
  type NotificationProviderKey,
  type ProviderTestSnapshot,
} from "@/lib/notification-test-state";

function useNotificationPrefs(businessId: number | undefined) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(() =>
    businessId ? getNotificationPreferences(businessId) : null,
  );

  useEffect(() => {
    if (!businessId) {
      setPrefs(null);
      return;
    }
    setPrefs(getNotificationPreferences(businessId));
    return subscribeNotificationPreferences(businessId, () => {
      setPrefs(getNotificationPreferences(businessId));
    });
  }, [businessId]);

  return prefs;
}

function useProviderTestSnapshots(businessId: number | undefined) {
  const [snapshots, setSnapshots] = useState<Record<NotificationProviderKey, ProviderTestSnapshot>>({
    email: { lastSuccessAt: null, lastError: null },
    sms: { lastSuccessAt: null, lastError: null },
    discord: { lastSuccessAt: null, lastError: null },
  });

  const refresh = useCallback(() => {
    if (!businessId) return;
    setSnapshots({
      email: getProviderTestSnapshot(businessId, "email"),
      sms: getProviderTestSnapshot(businessId, "sms"),
      discord: getProviderTestSnapshot(businessId, "discord"),
    });
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { snapshots, refresh };
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

type DeliveryForm = NotificationDeliveryForm;

export default function BusinessNotifications() {
  const { selectedBusinessId, business, isLoading } = useSelectedBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefs = useNotificationPrefs(selectedBusinessId ?? undefined);
  const { snapshots, refresh: refreshTestSnapshots } = useProviderTestSnapshots(selectedBusinessId ?? undefined);
  const [ntfyTestError, setNtfyTestError] = useState<string | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    notificationEmail: "",
    notificationPhone: "",
    discordWebhookUrl: "",
    discordEnabled: false,
    notifyNewOrdersByEmail: true,
    notifyNewOrdersBySms: false,
    notifyNewOrdersByDiscord: false,
    notifyAppointmentRequestsByEmail: true,
    notifyAppointmentRequestsBySms: false,
    notifyAppointmentRequestsByDiscord: false,
  });

  useEffect(() => {
    if (!business) return;
    setDeliveryForm(deliveryFormFromBusiness(business as unknown as Record<string, unknown>));
    setNtfyTestError(null);
  }, [business]);

  const savedDeliveryForm = useMemo(
    () => (business ? deliveryFormFromBusiness(business as unknown as Record<string, unknown>) : null),
    [business],
  );

  const emailSettingsDirty = savedDeliveryForm
    ? isEmailSettingsDirty(deliveryForm, savedDeliveryForm)
    : false;
  const smsSettingsDirty = savedDeliveryForm
    ? isSmsSettingsDirty(deliveryForm, savedDeliveryForm)
    : false;
  const discordSettingsDirty = savedDeliveryForm
    ? isDiscordSettingsDirty(deliveryForm, savedDeliveryForm)
    : false;

  const acceptsAppointments = acceptsAppointmentRequests(business ?? {});

  const invalidateBusiness = () => {
    if (selectedBusinessId != null) {
      queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey({ businessId: selectedBusinessId }) });
    }
  };

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        invalidateBusiness();
        toast({ title: "Settings saved" });
      },
      onError: (err: unknown) => {
        toast({
          title: "Failed to save settings",
          description: extractErrorMessage(err, "Please try again."),
          variant: "destructive",
        });
      },
    },
  });

  const opt = (value: string) => value.trim() || undefined;

  function saveEmailSettings() {
    if (!business) return;
    updateBusiness.mutate({
      id: business.id,
      data: {
        notificationEmail: opt(deliveryForm.notificationEmail),
        notifyNewOrdersByEmail: deliveryForm.notifyNewOrdersByEmail,
        notifyAppointmentRequestsByEmail: deliveryForm.notifyAppointmentRequestsByEmail,
      },
    });
  }

  function saveSmsSettings() {
    if (!business) return;
    updateBusiness.mutate({
      id: business.id,
      data: {
        notificationPhone: opt(deliveryForm.notificationPhone),
        notifyNewOrdersBySms: deliveryForm.notifyNewOrdersBySms,
        notifyAppointmentRequestsBySms: deliveryForm.notifyAppointmentRequestsBySms,
      },
    });
  }

  function saveDiscordSettings() {
    if (!business) return;
    const discordOn = deliveryForm.discordEnabled;
    updateBusiness.mutate({
      id: business.id,
      data: {
        discordWebhookUrl: opt(deliveryForm.discordWebhookUrl) ?? null,
        notifyNewOrdersByDiscord: discordOn && deliveryForm.notifyNewOrdersByDiscord,
        notifyAppointmentRequestsByDiscord:
          discordOn && deliveryForm.notifyAppointmentRequestsByDiscord,
      },
    });
  }

  function deliveryToggle(
    label: string,
    desc: string,
    key: keyof Pick<
      DeliveryForm,
      | "notifyNewOrdersByEmail"
      | "notifyNewOrdersBySms"
      | "notifyNewOrdersByDiscord"
      | "notifyAppointmentRequestsByEmail"
      | "notifyAppointmentRequestsBySms"
      | "notifyAppointmentRequestsByDiscord"
    >,
    disabled = false,
  ) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Switch
          checked={deliveryForm[key]}
          onCheckedChange={(val) => setDeliveryForm((f) => ({ ...f, [key]: val }))}
          disabled={disabled}
          data-testid={`switch-${key}`}
        />
      </div>
    );
  }

  const testEmail = useTestBusinessNotificationEmail({
    mutation: {
      onSuccess: (result) => {
        if (selectedBusinessId) recordProviderTestSuccess(selectedBusinessId, "email");
        refreshTestSnapshots();
        toast({
          title: "Test email sent",
          description: result.recipient ? `Sent to ${result.recipient}` : "Check your inbox.",
        });
      },
      onError: (err: unknown) => {
        const message = extractErrorMessage(err, "Please try again.");
        if (selectedBusinessId) recordProviderTestFailure(selectedBusinessId, "email", message);
        refreshTestSnapshots();
        toast({ title: "Test email failed", description: message, variant: "destructive" });
      },
    },
  });

  const testSms = useTestBusinessNotificationSms({
    mutation: {
      onSuccess: (result) => {
        if (selectedBusinessId) recordProviderTestSuccess(selectedBusinessId, "sms");
        refreshTestSnapshots();
        toast({
          title: "Test SMS sent",
          description: result.recipient ? `Sent to ${result.recipient}` : "Check your phone.",
        });
      },
      onError: (err: unknown) => {
        const message = extractErrorMessage(err, "Please try again.");
        if (selectedBusinessId) recordProviderTestFailure(selectedBusinessId, "sms", message);
        refreshTestSnapshots();
        toast({ title: "Test SMS failed", description: message, variant: "destructive" });
      },
    },
  });

  const testDiscord = useTestBusinessNotificationDiscord({
    mutation: {
      onSuccess: () => {
        if (selectedBusinessId) recordProviderTestSuccess(selectedBusinessId, "discord");
        refreshTestSnapshots();
        toast({ title: "Test Discord message sent", description: "Check your Discord channel." });
      },
      onError: (err: unknown) => {
        const message = extractErrorMessage(err, "Please try again.");
        if (selectedBusinessId) recordProviderTestFailure(selectedBusinessId, "discord", message);
        refreshTestSnapshots();
        toast({ title: "Test Discord failed", description: message, variant: "destructive" });
      },
    },
  });

  const testNtfy = useTestBusinessNotificationNtfy({
    mutation: {
      onSuccess: () => {
        setNtfyTestError(null);
        invalidateBusiness();
        toast({
          title: "Test notification sent",
          description: "Check the ntfy app on your phone.",
        });
      },
      onError: (err: unknown) => {
        const message = extractErrorMessage(err, "Subscribe in the ntfy app first, then try again.");
        setNtfyTestError(message);
        toast({ title: "Test notification failed", description: message, variant: "destructive" });
      },
    },
  });

  const regenerateNtfyTopic = useRegenerateBusinessNtfyTopic({
    mutation: {
      onSuccess: () => {
        invalidateBusiness();
        setNtfyTestError(null);
        toast({
          title: "Topic regenerated",
          description: "Copy the new topic and subscribe again in the ntfy app.",
        });
      },
      onError: (err: unknown) => {
        toast({
          title: "Failed to regenerate topic",
          description: extractErrorMessage(err, "Please try again."),
          variant: "destructive",
        });
      },
    },
  });

  const b = business as unknown as Record<string, unknown> | undefined;
  const ntfyEnabled = b?.ntfyEnabled === true;
  const ntfyTopic = typeof b?.ntfyTopic === "string" ? b.ntfyTopic : "";
  const ntfySubscriptionUrl = typeof b?.ntfySubscriptionUrl === "string" ? b.ntfySubscriptionUrl : null;

  function handleNtfyToggle(enabled: boolean) {
    if (!business) return;
    updateBusiness.mutate({ id: business.id, data: { ntfyEnabled: enabled } });
  }

  async function copyNtfyTopic() {
    if (!ntfyTopic) return;
    try {
      await navigator.clipboard.writeText(ntfyTopic);
      toast({ title: "Topic copied", description: "Paste it into Subscribe in the ntfy app." });
    } catch {
      toast({ title: "Could not copy topic", variant: "destructive" });
    }
  }

  async function copyNtfySubscriptionUrl() {
    if (!ntfySubscriptionUrl) return;
    try {
      await navigator.clipboard.writeText(ntfySubscriptionUrl);
      toast({ title: "Subscription link copied" });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  }

  const emailConfigured = Boolean(deliveryForm.notificationEmail.trim());
  const smsConfigured = Boolean(deliveryForm.notificationPhone.trim());
  const discordConfigured = Boolean(deliveryForm.discordWebhookUrl.trim());
  const settingsSaving = updateBusiness.isPending;

  const emailTestDisabled = !emailConfigured || emailSettingsDirty || settingsSaving;
  const smsTestDisabled = !smsConfigured || smsSettingsDirty || settingsSaving;
  const discordTestDisabled =
    !deliveryForm.discordEnabled || !discordConfigured || discordSettingsDirty || settingsSaving;

  const emailConnection = resolveConnectionDisplay(snapshots.email);
  const smsConnection = resolveConnectionDisplay(snapshots.sms);
  const discordConnection = resolveConnectionDisplay(snapshots.discord);
  const ntfyConnection = resolveConnectionDisplay({
    lastSuccessAt: b?.ntfyLastTestAt ? String(b.ntfyLastTestAt) : null,
    lastError: ntfyTestError,
  });

  function handleTestSound() {
    if (!prefs) return;
    unlockNotificationSound();
    playNotificationSound(prefs.volume);
    toast({ title: "Test sound played" });
  }

  if (isLoading || !business || !prefs) {
    return (
      <BusinessDashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-serif font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </BusinessDashboardLayout>
    );
  }

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="business-notifications-page">
        <div>
          <h1 className="text-2xl font-serif font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure how you&apos;re alerted when you&apos;re away and while Business Hub is open.
          </p>
        </div>

        <NotificationProviderCard
          title="Email"
          description="Receive order and appointment alerts in your inbox."
          icon={<Mail className="h-4 w-4" />}
          testId="notification-email-card"
        >
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="notification-email">
              Notification email
            </label>
            <Input
              id="notification-email"
              type="email"
              value={deliveryForm.notificationEmail}
              onChange={(e) => setDeliveryForm((f) => ({ ...f, notificationEmail: e.target.value }))}
              placeholder="owner@yourbusiness.com"
              data-testid="input-notificationEmail"
            />
          </div>

          <Separator />

          <div className="space-y-1 divide-y divide-border">
            {deliveryToggle(
              "New orders",
              "Email when a customer places an order",
              "notifyNewOrdersByEmail",
            )}
            {acceptsAppointments &&
              deliveryToggle(
                "Appointment requests",
                "Email when a customer requests an appointment",
                "notifyAppointmentRequestsByEmail",
              )}
          </div>

          <ProviderConnectionStatus
            status={emailConnection.status}
            lastSuccessAt={emailConnection.lastSuccessAt}
            failureReason={emailConnection.failureReason}
            statusTestId="email-connection-status"
          />

          <ProviderActionButtons
            onSave={saveEmailSettings}
            saveLoading={updateBusiness.isPending}
            saveTestId="save-email-settings"
            onTest={() => selectedBusinessId && testEmail.mutate({ businessId: selectedBusinessId })}
            testLoading={testEmail.isPending}
            testLabel="Send test email"
            testTestId="test-notification-email"
            testDisabled={emailTestDisabled}
            testDisabledTitle={
              emailSettingsDirty ? UNSAVED_SETTINGS_TEST_HINT : !emailConfigured ? "Add an email address first" : undefined
            }
          />
        </NotificationProviderCard>

        <NotificationProviderCard
          title="SMS"
          description="Urgent text alerts for new orders and appointments."
          icon={<MessageSquare className="h-4 w-4" />}
          testId="notification-sms-card"
        >
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="notification-phone">
              Notification phone
            </label>
            <Input
              id="notification-phone"
              type="tel"
              value={deliveryForm.notificationPhone}
              onChange={(e) => setDeliveryForm((f) => ({ ...f, notificationPhone: e.target.value }))}
              placeholder="+15555550100"
              data-testid="input-notificationPhone"
            />
          </div>

          <Separator />

          <div className="space-y-1 divide-y divide-border">
            {deliveryToggle("New orders", "Text when a customer places an order", "notifyNewOrdersBySms")}
            {acceptsAppointments &&
              deliveryToggle(
                "Appointment requests",
                "Text when a customer requests an appointment",
                "notifyAppointmentRequestsBySms",
              )}
          </div>

          <ProviderConnectionStatus
            status={smsConnection.status}
            lastSuccessAt={smsConnection.lastSuccessAt}
            failureReason={smsConnection.failureReason}
            statusTestId="sms-connection-status"
          />

          <ProviderActionButtons
            onSave={saveSmsSettings}
            saveLoading={updateBusiness.isPending}
            saveTestId="save-sms-settings"
            onTest={() => selectedBusinessId && testSms.mutate({ businessId: selectedBusinessId })}
            testLoading={testSms.isPending}
            testLabel="Send test SMS"
            testTestId="test-notification-sms"
            testDisabled={smsTestDisabled}
            testDisabledTitle={
              smsSettingsDirty ? UNSAVED_SETTINGS_TEST_HINT : !smsConfigured ? "Add a phone number first" : undefined
            }
          />
        </NotificationProviderCard>

        <NotificationProviderCard
          title="Free phone notifications"
          description="Instant alerts on your phone without SMS charges via the ntfy app."
          icon={<Smartphone className="h-4 w-4" />}
          testId="ntfy-phone-notifications-card"
        >
          <ProviderEnableRow
            label="Enable phone notifications"
            description="Uses the free ntfy app — no SMS fees from TownHub."
            checked={ntfyEnabled}
            onCheckedChange={handleNtfyToggle}
            disabled={updateBusiness.isPending}
            testId="toggle-ntfy-enabled"
          />

          {ntfyEnabled ? (
            <>
              <ProviderSetupInstructions>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    Install the free{" "}
                    <a
                      href="https://ntfy.sh/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      ntfy app
                    </a>{" "}
                    (iOS or Android).
                  </li>
                  <li>
                    Open ntfy and tap <span className="text-foreground">+</span> or{" "}
                    <span className="text-foreground">Subscribe to topic</span>.
                  </li>
                  <li>
                    Tap <span className="text-foreground">Copy topic</span> below and paste it into the
                    topic field. Leave the server as <span className="text-foreground">ntfy.sh</span>.
                  </li>
                  <li>Send a test notification to confirm alerts arrive on your phone.</li>
                </ol>
              </ProviderSetupInstructions>

              <div>
                <p className="text-sm font-medium mb-1.5">Your topic</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={ntfyTopic}
                    className="font-mono text-xs"
                    data-testid="ntfy-topic-display"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyNtfyTopic()}
                    disabled={!ntfyTopic}
                    data-testid="copy-ntfy-topic"
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy topic
                  </Button>
                </div>
              </div>

              {ntfySubscriptionUrl ? (
                <div>
                  <p className="text-sm font-medium mb-1.5">Subscription link</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={ntfySubscriptionUrl}
                      className="font-mono text-xs"
                      data-testid="ntfy-subscription-url-display"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copyNtfySubscriptionUrl()}
                      data-testid="copy-ntfy-subscription-url"
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Optional — open this link on your phone if your browser offers to open it in ntfy.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={regenerateNtfyTopic.isPending}
                      data-testid="regenerate-ntfy-topic"
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Regenerate topic
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate topic?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This immediately invalidates your old topic. Subscribe again in the ntfy app with
                        the new topic.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          selectedBusinessId &&
                          regenerateNtfyTopic.mutate({ businessId: selectedBusinessId })
                        }
                      >
                        Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Turn on phone notifications to generate a private topic for the ntfy app.
            </p>
          )}

          <ProviderConnectionStatus
            status={ntfyConnection.status}
            lastSuccessAt={ntfyConnection.lastSuccessAt}
            failureReason={ntfyConnection.failureReason}
            statusTestId="ntfy-connection-status"
          />

          <ProviderActionButtons
            showSave={false}
            onTest={() => selectedBusinessId && testNtfy.mutate({ businessId: selectedBusinessId })}
            testLoading={testNtfy.isPending}
            testLabel="Send test notification"
            testTestId="test-notification-ntfy"
            testDisabled={!ntfyEnabled || !ntfyTopic || settingsSaving}
            testDisabledTitle={!ntfyEnabled || !ntfyTopic ? "Enable phone notifications and copy your topic first" : undefined}
          />
        </NotificationProviderCard>

        <NotificationProviderCard
          title="Discord"
          description="Post alerts to a Discord channel your team already monitors."
          icon={<Hash className="h-4 w-4" />}
          testId="notification-discord-card"
        >
          <ProviderEnableRow
            label="Enable Discord notifications"
            description="Send order and appointment alerts to your webhook."
            checked={deliveryForm.discordEnabled}
            onCheckedChange={(enabled) =>
              setDeliveryForm((f) => ({
                ...f,
                discordEnabled: enabled,
                notifyNewOrdersByDiscord: enabled ? f.notifyNewOrdersByDiscord || true : false,
                notifyAppointmentRequestsByDiscord: enabled
                  ? f.notifyAppointmentRequestsByDiscord
                  : false,
              }))
            }
            testId="toggle-discord-enabled"
          />

          <ProviderSetupInstructions>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Discord and pick the channel for alerts (for example, #orders).</li>
              <li>
                Channel Settings → <span className="text-foreground">Integrations</span> →{" "}
                <span className="text-foreground">Webhooks</span> → <span className="text-foreground">New Webhook</span>.
              </li>
              <li>Copy the webhook URL and paste it below.</li>
              <li>Save settings, then send a test notification.</li>
            </ol>
          </ProviderSetupInstructions>

          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="discord-webhook-url">
              Webhook URL
            </label>
            <Input
              id="discord-webhook-url"
              type="url"
              value={deliveryForm.discordWebhookUrl}
              onChange={(e) => setDeliveryForm((f) => ({ ...f, discordWebhookUrl: e.target.value }))}
              placeholder="https://discord.com/api/webhooks/..."
              disabled={!deliveryForm.discordEnabled}
              data-testid="input-discordWebhookUrl"
            />
          </div>

          {deliveryForm.discordEnabled ? (
            <>
              <Separator />
              <div className="space-y-1 divide-y divide-border">
                {deliveryToggle(
                  "New orders",
                  "Post when a customer places an order",
                  "notifyNewOrdersByDiscord",
                )}
                {acceptsAppointments &&
                  deliveryToggle(
                    "Appointment requests",
                    "Post when a customer requests an appointment",
                    "notifyAppointmentRequestsByDiscord",
                  )}
              </div>
            </>
          ) : null}

          <ProviderConnectionStatus
            status={discordConnection.status}
            lastSuccessAt={discordConnection.lastSuccessAt}
            failureReason={discordConnection.failureReason}
            statusTestId="discord-connection-status"
          />

          <ProviderActionButtons
            onSave={saveDiscordSettings}
            saveLoading={updateBusiness.isPending}
            saveTestId="save-discord-settings"
            onTest={() => selectedBusinessId && testDiscord.mutate({ businessId: selectedBusinessId })}
            testLoading={testDiscord.isPending}
            testLabel="Send test notification"
            testTestId="test-notification-discord"
            testDisabled={discordTestDisabled}
            testDisabledTitle={
              discordSettingsDirty
                ? UNSAVED_SETTINGS_TEST_HINT
                : !deliveryForm.discordEnabled || !discordConfigured
                  ? "Enable Discord and add a webhook URL first"
                  : undefined
            }
          />
        </NotificationProviderCard>

        <NotificationProviderCard
          title="In-shop sound"
          description="Play a chime when Business Hub is open and a new order or appointment arrives."
          icon={<Volume2 className="h-4 w-4" />}
          testId="notification-sound-card"
        >
          <ProviderEnableRow
            label="Enable notification sound"
            checked={prefs.soundsEnabled}
            onCheckedChange={(checked) => {
              if (!selectedBusinessId) return;
              setNotificationPreferences(selectedBusinessId, { soundsEnabled: checked });
              if (checked) unlockNotificationSound();
            }}
            testId="toggle-notification-sounds"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Volume</label>
              <span className="text-xs text-muted-foreground">{prefs.volume}%</span>
            </div>
            <Slider
              value={[prefs.volume]}
              min={0}
              max={100}
              step={5}
              onValueChange={([volume]) => {
                if (!selectedBusinessId) return;
                setNotificationPreferences(selectedBusinessId, { volume: volume ?? prefs.volume });
              }}
              data-testid="notification-volume-slider"
            />
          </div>

          <ProviderActionButtons
            showSave={false}
            onTest={handleTestSound}
            testLabel="Test sound"
            testTestId="test-notification-sound"
          />
        </NotificationProviderCard>

        <Separator />

        <UserNotificationPreferencesPanel audience="BUSINESS_OWNER" />
      </div>
    </BusinessDashboardLayout>
  );
}
