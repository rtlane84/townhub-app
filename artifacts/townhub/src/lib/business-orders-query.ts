/** Query params for scoped business order lists (kitchen / live alerts). */
export type BusinessOrderListQuery = {
  activeOnly?: boolean;
  since?: string;
};

/** Active kitchen/live queue: active statuses within the default server lookback window. */
export const KITCHEN_LIVE_ORDER_LIST_QUERY: BusinessOrderListQuery = {
  activeOnly: true,
};

export function getBusinessOrdersQueryKey(
  businessId: number,
  query?: BusinessOrderListQuery,
) {
  const base = `/api/businesses/${businessId}/orders` as const;
  if (!query?.activeOnly && !query?.since) {
    return [base] as const;
  }
  return [base, query] as const;
}

export function getKitchenBusinessOrdersQueryKey(businessId: number) {
  return getBusinessOrdersQueryKey(businessId, KITCHEN_LIVE_ORDER_LIST_QUERY);
}

export function buildBusinessOrdersUrl(
  businessId: number,
  query?: BusinessOrderListQuery,
): string {
  const params = new URLSearchParams();
  if (query?.activeOnly) params.set("activeOnly", "true");
  if (query?.since) params.set("since", query.since);
  const qs = params.toString();
  return `/api/businesses/${businessId}/orders${qs ? `?${qs}` : ""}`;
}
