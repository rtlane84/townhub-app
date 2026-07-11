import { useMemo, type ReactNode } from "react";
import {
  useGetMyNotificationPreferences,
  useUpdateMyNotificationPreferences,
  getGetMyNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";
import {
  NotificationProviderCard,
  ProviderEnableRow,
} from "@/components/notifications/notification-provider-ui";
import { channelAlertsHelperText } from "@/lib/notification-settings-form";

type Audience = "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "CUSTOMER";

/** Operational App Push categories controlled by the single Enable toggle. */
export const OWNER_OPERATIONAL_PUSH_CATEGORIES = [
  "OWNER_NEW_ORDER",
  "OWNER_APPOINTMENT_REQUEST",
] as const;

type Props = {
  audience?: Audience;
  title?: string;
  description?: string;
  enableDescription?: string;
  acceptsAppointments?: boolean;
  icon?: ReactNode;
  testId?: string;
};

export function UserNotificationPreferencesPanel({
  audience = "BUSINESS_OWNER",
  title = "TownHub App Push",
  description = "Operational alerts on your signed-in phone. Critical payment and account alerts always use email and TownHub app push.",
  enableDescription,
  acceptsAppointments = false,
  icon = <Bell className="h-4 w-4" />,
  testId = "user-notification-preferences",
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () =>
      getGetMyNotificationPreferencesQueryKey({
        audience,
        implementedOnly: true,
      }),
    [audience],
  );

  const { data, isLoading, isError } = useGetMyNotificationPreferences(
    { audience, implementedOnly: true },
    { query: { queryKey } },
  );
  const update = useUpdateMyNotificationPreferences();

  const preferences = data?.preferences ?? [];
  const operationalPrefs = preferences.filter((pref) =>
    (OWNER_OPERATIONAL_PUSH_CATEGORIES as readonly string[]).includes(pref.category),
  );
  // Enabled if either operational category is on (same pattern as Email/SMS channel Enable).
  const pushEnabled =
    operationalPrefs.length === 0 ? true : operationalPrefs.some((pref) => pref.enabled);

  const enableHelper =
    enableDescription ?? channelAlertsHelperText(acceptsAppointments);

  async function setOperationalPushEnabled(enabled: boolean) {
    try {
      await update.mutateAsync({
        data: {
          preferences: OWNER_OPERATIONAL_PUSH_CATEGORIES.map((category) => ({
            category,
            enabled,
          })),
        },
      });
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      toast({
        title: "Could not update preference",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  }

  return (
    <NotificationProviderCard
      title={title}
      description={description}
      icon={icon}
      testId={testId}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preferences…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load notification preferences.</p>
      ) : (
        <ProviderEnableRow
          label="Enable app push"
          description={enableHelper}
          checked={pushEnabled}
          onCheckedChange={(checked) => {
            void setOperationalPushEnabled(checked);
          }}
          disabled={update.isPending}
          testId="toggle-app-push-enabled"
        />
      )}
    </NotificationProviderCard>
  );
}
