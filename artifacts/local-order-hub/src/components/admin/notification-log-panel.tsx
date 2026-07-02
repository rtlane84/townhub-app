import { useMemo, useState } from "react";
import { useListNotificationLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, CheckCircle, AlertCircle, Clock } from "lucide-react";

type StatusFilter = "ALL" | "SENT" | "LOGGED" | "FAILED";
type ChannelFilter = "ALL" | "EMAIL" | "SMS";

export function NotificationLogPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");

  const queryParams = useMemo(
    () => ({
      limit: 50,
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(channelFilter !== "ALL" ? { channel: channelFilter } : {}),
    }),
    [statusFilter, channelFilter],
  );

  const { data: notifLogs = [], isLoading, isError } = useListNotificationLogs(queryParams, {
    query: { queryKey: ["/api/admin/notification-logs", queryParams] },
  });

  return (
    <Card data-testid="notification-log-panel">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="font-serif">Notification History</CardTitle>
              <CardDescription className="mt-1">
                Recent email and SMS notifications for troubleshooting. When no provider is configured, entries are
                logged here instead of delivered.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="LOGGED">Logged</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as ChannelFilter)}>
              <SelectTrigger className="w-[130px]" aria-label="Filter by channel">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All channels</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Notification logs could not be loaded. Other system status sections remain available.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notification logs…</p>
        ) : notifLogs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications match these filters yet.</p>
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
                {log.errorMessage && <p className="text-xs text-destructive">{log.errorMessage}</p>}
                <pre className="text-xs bg-muted/50 rounded p-2 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {log.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
