import type { QueryClient } from "@tanstack/react-query";
import {
  getBusinessOrderSummary,
  getGetBusinessOrderSummaryQueryKey,
  type Order,
  type BusinessOrderSummary,
} from "@workspace/api-client-react";
import {
  getKitchenBusinessOrdersQueryKey,
  listKitchenBusinessOrders,
} from "@/lib/business-orders-api";
import {
  detectOrderListChanges,
  orderListsEqual,
  orderSummariesEqual,
} from "@/lib/order-dashboard-sync";

export type OrderLiveRefreshResult = {
  orders: Order[];
  summary: BusinessOrderSummary;
  changes: ReturnType<typeof detectOrderListChanges>;
};

export async function fetchOwnerOrderDashboardData(
  queryClient: QueryClient,
  businessId: number,
): Promise<OrderLiveRefreshResult> {
  const staleTime = 0;
  const [orders, summary] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: getKitchenBusinessOrdersQueryKey(businessId),
      queryFn: ({ signal }) => listKitchenBusinessOrders(businessId, { signal }),
      staleTime,
    }),
    queryClient.fetchQuery({
      queryKey: getGetBusinessOrderSummaryQueryKey(businessId),
      queryFn: () => getBusinessOrderSummary(businessId),
      staleTime,
    }),
  ]);

  const listKey = getKitchenBusinessOrdersQueryKey(businessId);
  const summaryKey = getGetBusinessOrderSummaryQueryKey(businessId);
  const previousOrders = queryClient.getQueryData<Order[]>(listKey);
  const changes = detectOrderListChanges(previousOrders, orders);

  if (!orderListsEqual(previousOrders, orders)) {
    queryClient.setQueryData(listKey, orders);
  }

  const previousSummary = queryClient.getQueryData<BusinessOrderSummary>(summaryKey);
  if (!orderSummariesEqual(previousSummary, summary)) {
    queryClient.setQueryData(summaryKey, summary);
  }

  return { orders, summary, changes };
}

export function maxOrderId(orders: Order[]): number {
  if (!orders.length) return 0;
  return Math.max(...orders.map((o) => o.id));
}

export function findNewOrdersSince(
  orders: Order[],
  latestKnownId: number,
  alertedIds: ReadonlySet<number>,
): Order[] {
  return orders
    .filter((o) => o.id > latestKnownId && !alertedIds.has(o.id))
    .sort((a, b) => a.id - b.id);
}
