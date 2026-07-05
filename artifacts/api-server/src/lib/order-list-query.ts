/** Statuses shown on the kitchen display and live order queue. */
export const ACTIVE_KITCHEN_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
] as const;

/** Default lookback when `activeOnly` is set without an explicit `since`. */
export const ACTIVE_ORDER_LIST_DEFAULT_SINCE_DAYS = 30;

export type ParsedBusinessOrderListQuery = {
  status?: string;
  activeOnly: boolean;
  since: Date | null;
};

export function getDefaultActiveOrdersSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - ACTIVE_ORDER_LIST_DEFAULT_SINCE_DAYS);
  since.setHours(0, 0, 0, 0);
  return since;
}

export function parseBusinessOrderListQuery(
  query: Record<string, string | undefined>,
): ParsedBusinessOrderListQuery {
  const status = query.status?.trim() || undefined;
  const activeOnly = query.activeOnly === "true" || query.activeOnly === "1";

  let since: Date | null = null;
  if (query.since?.trim()) {
    const parsed = new Date(query.since);
    if (!Number.isNaN(parsed.getTime())) {
      since = parsed;
    }
  } else if (activeOnly) {
    since = getDefaultActiveOrdersSince();
  }

  return { status, activeOnly, since };
}
