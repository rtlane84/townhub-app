import { customFetch, type Order } from "@workspace/api-client-react";
import {
  buildBusinessOrdersUrl,
  KITCHEN_LIVE_ORDER_LIST_QUERY,
  type BusinessOrderListQuery,
} from "./business-orders-query";

export type { BusinessOrderListQuery };
export {
  getBusinessOrdersQueryKey,
  getKitchenBusinessOrdersQueryKey,
  KITCHEN_LIVE_ORDER_LIST_QUERY,
} from "./business-orders-query";

export async function listBusinessOrdersWithQuery(
  businessId: number,
  query?: BusinessOrderListQuery,
  options?: RequestInit,
): Promise<Order[]> {
  return customFetch<Order[]>(buildBusinessOrdersUrl(businessId, query), {
    ...options,
    method: "GET",
  });
}

export function listKitchenBusinessOrders(
  businessId: number,
  options?: RequestInit,
): Promise<Order[]> {
  return listBusinessOrdersWithQuery(
    businessId,
    KITCHEN_LIVE_ORDER_LIST_QUERY,
    options,
  );
}
