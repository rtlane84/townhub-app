import type { PlatformActivityEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  application_submitted: "Application",
  application_approved: "Approval",
  subscription_started: "Subscription",
  subscription_canceled: "Cancellation",
  order_placed: "Order",
  settings_changed: "Settings",
  plan_changed: "Plan",
  feature_enabled: "Feature",
  feature_disabled: "Feature",
};

export function RecentActivityPanel({ activity }: { activity: PlatformActivityEntry[] }) {
  return (
    <Card data-testid="recent-activity-panel">
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Recent Activity
        </CardTitle>
        <CardDescription>Important platform events to help trace operational changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent platform activity found.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {activity.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABEL[entry.type] ?? entry.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium">{entry.title}</span>
                  </div>
                  {entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
