import type { PlatformActivityEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  application_submitted: "Application",
  application_approved: "Approval",
  application_rejected: "Rejection",
  business_deleted: "Deletion",
  subscription_started: "Subscription",
  subscription_canceled: "Cancellation",
  subscription_renewed: "Renewal",
  subscription_past_due: "Past due",
  subscription_expired: "Expired",
  plan_changed: "Plan",
  feature_enabled: "Feature",
  feature_disabled: "Feature",
  stripe_account_connected: "Stripe",
  stripe_account_disconnected: "Stripe",
  business_owner_invited: "Invite",
  admin_login: "Admin",
  failed_login: "Auth",
  settings_changed: "Settings",
  weather_settings_updated: "Weather",
  system_configuration_changed: "System",
  email_provider_changed: "Email",
  order_placed: "Order",
};

const TYPE_TONE: Record<string, "default" | "destructive" | "secondary"> = {
  application_rejected: "destructive",
  subscription_canceled: "destructive",
  subscription_past_due: "destructive",
  subscription_expired: "destructive",
  failed_login: "destructive",
  business_deleted: "destructive",
};

export function RecentActivityPanel({ activity }: { activity: PlatformActivityEntry[] }) {
  return (
    <Card data-testid="recent-activity-panel">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Platform Audit Log
        </CardTitle>
        <CardDescription className="text-xs">
          Important platform events reconstructed from business, subscription, and settings data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent platform activity found.</p>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg px-3 py-2 text-sm flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={TYPE_TONE[entry.type] ?? "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {TYPE_LABEL[entry.type] ?? entry.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium text-xs sm:text-sm">{entry.title}</span>
                  </div>
                  {entry.detail && <p className="text-xs text-muted-foreground truncate">{entry.detail}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {entry.actorLabel && <span>By {entry.actorLabel}</span>}
                    {entry.businessName && <span>{entry.businessName}</span>}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
