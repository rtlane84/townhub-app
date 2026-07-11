import { useMemo, useState } from "react";
import { useListNotificationLogs, type NotificationLog } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bell, CheckCircle, AlertCircle, Clock, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "SENT" | "LOGGED" | "FAILED";
type ChannelFilter = "ALL" | "EMAIL" | "SMS";

function deliveryProvider(channel: string | undefined): string {
  if (channel === "SMS") return "Twilio";
  if (channel === "EMAIL") return "Resend / SMTP";
  return "Unknown";
}

function isHtmlBody(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

function NotificationEntry({ log }: { log: NotificationLog }) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"plain" | "html">("plain");
  const recipient = log.recipientEmail ?? log.recipientPhone ?? "Unknown recipient";
  const htmlContent = isHtmlBody(log.body);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg text-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-muted/40 rounded-lg transition-colors"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
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
              <div className="truncate">
                {log.subject && <span className="font-medium">{log.subject}</span>}
                <span className="text-muted-foreground"> → {recipient}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {new Date(log.createdAt).toLocaleString()}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3 border-t mx-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-3">
              <div>
                <dt className="text-muted-foreground">Recipient</dt>
                <dd className="font-medium">{recipient}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery provider</dt>
                <dd className="font-medium">{deliveryProvider(log.channel)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivery status</dt>
                <dd className="font-medium">{log.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-medium">{new Date(log.createdAt).toLocaleString()}</dd>
              </div>
            </dl>

            {log.errorMessage && <p className="text-xs text-destructive">{log.errorMessage}</p>}

            {log.channel === "EMAIL" && htmlContent && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={viewMode === "plain" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setViewMode("plain")}
                >
                  Plain text
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "html" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setViewMode("html")}
                >
                  HTML preview
                </Button>
              </div>
            )}

            {viewMode === "html" && htmlContent ? (
              <iframe
                title={`Email preview ${log.id}`}
                sandbox=""
                srcDoc={log.body}
                className="w-full min-h-[200px] max-h-64 rounded border bg-white"
              />
            ) : (
              <pre className="text-xs bg-muted/50 rounded p-2 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                {log.body}
              </pre>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted-foreground">Retry delivery (coming soon)</p>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled>
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function NotificationLogPanel({
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
}: {
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (filter: StatusFilter) => void;
} = {}) {
  const [internalStatusFilter, setInternalStatusFilter] = useState<StatusFilter>("ALL");
  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const setStatusFilter = onStatusFilterChange ?? setInternalStatusFilter;
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
    <Card data-testid="notification-log-panel" id="notification-log-panel">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="font-serif text-lg">Notification History</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Expand any entry to inspect delivery details and message content.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[130px] h-8 text-xs" aria-label="Filter by status">
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
              <SelectTrigger className="w-[120px] h-8 text-xs" aria-label="Filter by channel">
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
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications match these filters yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {notifLogs.map((log) => (
              <NotificationEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
