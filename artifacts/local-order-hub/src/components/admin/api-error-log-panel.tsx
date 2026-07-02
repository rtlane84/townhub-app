import type { ApiErrorLogEntry } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileWarning } from "lucide-react";

export function ApiErrorLogPanel({ errors }: { errors: ApiErrorLogEntry[] }) {
  return (
    <Card data-testid="api-error-log-panel">
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-muted-foreground" />
          API Error Log
        </CardTitle>
        <CardDescription>Recent application errors from API responses and operational events (last 50).</CardDescription>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent API errors recorded in this server process.</p>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {errors.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.httpStatus >= 500 ? "destructive" : "secondary"}>{entry.httpStatus}</Badge>
                    <span className="font-mono text-xs">{entry.endpoint}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{entry.summary}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
