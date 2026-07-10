import type { BusinessLiveConnectionStatus } from "@/hooks/business-live-events-provider";

/** Maps raw connection state to a user-visible label on live dashboard pages. */
export function resolveLiveIndicatorStatus(
  status: BusinessLiveConnectionStatus,
  usePollingFallback: boolean,
): BusinessLiveConnectionStatus {
  if (status !== "disconnected") return status;
  return usePollingFallback ? "fallback" : "connecting";
}
