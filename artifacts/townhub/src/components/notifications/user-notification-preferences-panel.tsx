import { useMemo } from "react";
import {
  useGetMyNotificationPreferences,
  useUpdateMyNotificationPreferences,
  getGetMyNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Audience = "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "CUSTOMER";

type Props = {
  audience?: Audience;
  title?: string;
  description?: string;
};

export function UserNotificationPreferencesPanel({
  audience,
  title = "Push & in-app categories",
  description = "Choose which TownHub alerts you want on your signed-in devices. Email, SMS, Discord, and ntfy delivery for your business are configured separately above.",
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

  async function setEnabled(category: string, enabled: boolean) {
    try {
      await update.mutateAsync({
        data: { preferences: [{ category, enabled }] },
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
    <div className="space-y-4" data-testid="user-notification-preferences">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preferences…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load notification preferences.</p>
      ) : preferences.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories available for your account.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {preferences.map((pref) => (
            <li
              key={pref.category}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
              </div>
              <Switch
                checked={pref.enabled}
                disabled={update.isPending}
                onCheckedChange={(checked) => {
                  void setEnabled(pref.category, checked);
                }}
                aria-label={pref.label}
                data-testid={`pref-${pref.category}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
