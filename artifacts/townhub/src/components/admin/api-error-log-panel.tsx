import { useMemo, useState } from "react";
import type { ApiErrorLogEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileWarning, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeFilter = "ALL" | "1H" | "24H" | "7D";

function matchesTimeFilter(timestamp: string, filter: TimeFilter): boolean {
  if (filter === "ALL") return true;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (filter === "1H") return ageMs <= 60 * 60 * 1000;
  if (filter === "24H") return ageMs <= 24 * 60 * 60 * 1000;
  return ageMs <= 7 * 24 * 60 * 60 * 1000;
}

function ErrorEntry({ entry, isDevelopment }: { entry: ApiErrorLogEntry; isDevelopment: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg text-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left p-2.5 flex items-start justify-between gap-2 hover:bg-muted/40 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Badge variant={entry.httpStatus >= 500 ? "destructive" : "secondary"} className="text-xs shrink-0">
                {entry.httpStatus}
              </Badge>
              <span className="font-mono text-xs truncate">{entry.endpoint}</span>
              {entry.businessName && (
                <Badge variant="outline" className="text-xs truncate max-w-[140px]">
                  {entry.businessName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t mx-2.5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
              <div>
                <dt className="text-muted-foreground">HTTP status</dt>
                <dd className="font-medium">{entry.httpStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="font-mono font-medium break-all">{entry.endpoint}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-medium">{new Date(entry.timestamp).toLocaleString()}</dd>
              </div>
              {entry.requestId && (
                <div>
                  <dt className="text-muted-foreground">Request ID</dt>
                  <dd className="font-mono font-medium break-all">{entry.requestId}</dd>
                </div>
              )}
              {(entry.userLabel || entry.userId) && (
                <div>
                  <dt className="text-muted-foreground">User</dt>
                  <dd className="font-medium">{entry.userLabel ?? entry.userId}</dd>
                </div>
              )}
              {(entry.businessName || entry.businessId != null) && (
                <div>
                  <dt className="text-muted-foreground">Business</dt>
                  <dd className="font-medium">
                    {entry.businessName ?? `Business #${entry.businessId}`}
                  </dd>
                </div>
              )}
            </dl>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Exception message</p>
              <p className="text-xs">{entry.exceptionMessage ?? entry.summary}</p>
            </div>
            {isDevelopment && entry.stackTrace && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Stack trace (development only)</p>
                <pre className="text-[11px] bg-muted/50 rounded p-2 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {entry.stackTrace}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ApiErrorLogPanel({
  errors,
  isDevelopment = false,
}: {
  errors: ApiErrorLogEntry[];
  isDevelopment?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [endpointFilter, setEndpointFilter] = useState("");
  const [businessFilter, setBusinessFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("ALL");

  const filtered = useMemo(() => {
    return errors.filter((entry) => {
      if (statusFilter !== "ALL" && String(entry.httpStatus) !== statusFilter) return false;
      if (endpointFilter && !entry.endpoint.toLowerCase().includes(endpointFilter.toLowerCase())) return false;
      if (businessFilter) {
        const businessNeedle = businessFilter.toLowerCase();
        const businessHay =
          `${entry.businessName ?? ""} ${entry.businessId ?? ""}`.toLowerCase();
        if (!businessHay.includes(businessNeedle)) return false;
      }
      if (!matchesTimeFilter(entry.timestamp, timeFilter)) return false;
      return true;
    });
  }, [errors, statusFilter, endpointFilter, businessFilter, timeFilter]);

  const statusCodes = useMemo(
    () => [...new Set(errors.map((e) => String(e.httpStatus)))].sort((a, b) => Number(a) - Number(b)),
    [errors],
  );

  return (
    <Card data-testid="api-error-log-panel" id="api-error-log-panel">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-muted-foreground" />
          API Error Log
        </CardTitle>
        <CardDescription className="text-xs">
          Recent application errors from API responses and operational events. Expand for full context.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs" aria-label="Filter by status code">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All codes</SelectItem>
              {statusCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={endpointFilter}
            onChange={(e) => setEndpointFilter(e.target.value)}
            placeholder="Filter endpoint…"
            className="h-8 text-xs w-[160px]"
            aria-label="Filter by endpoint"
          />
          <Input
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            placeholder="Filter business…"
            className="h-8 text-xs w-[140px]"
            aria-label="Filter by business"
          />
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[110px] h-8 text-xs" aria-label="Filter by time">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All time</SelectItem>
              <SelectItem value="1H">Last hour</SelectItem>
              <SelectItem value="24H">Last 24h</SelectItem>
              <SelectItem value="7D">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent API errors recorded in this server process.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors match the current filters.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map((entry) => (
              <ErrorEntry key={entry.id} entry={entry} isDevelopment={isDevelopment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
