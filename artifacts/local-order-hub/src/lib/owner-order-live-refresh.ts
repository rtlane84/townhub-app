import type { QueryClient } from "@tanstack/react-query";
import {
  getBusinessOrderSummary,
  getGetBusinessOrderSummaryQueryKey,
  getListBusinessOrdersQueryKey,
  type Order,
  type BusinessOrderSummary,
} from "@workspace/api-client-react";
import {
  getKitchenBusinessOrdersQueryKey,
  listBusinessOrdersWithQuery,
  listKitchenBusinessOrders,
} from "@/lib/business-orders-api";
import {
  detectOrderListChanges,
  orderListsEqual,
  orderSummariesEqual,
} from "@/lib/order-dashboard-sync";
import { maxOrderId } from "@/lib/owner-order-alert-state";
import { isQueryCancellationError } from "@/lib/query-cancellation";

export { maxOrderId, findNewOrdersSince } from "@/lib/owner-order-alert-state";

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
  const kitchenListKey = getKitchenBusinessOrdersQueryKey(businessId);
  const fullListKey = getListBusinessOrdersQueryKey(businessId);
  const summaryKey = getGetBusinessOrderSummaryQueryKey(businessId);

  try {
    const [orders, summary] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: kitchenListKey,
        queryFn: ({ signal }) => listKitchenBusinessOrders(businessId, { signal }),
        staleTime,
      }),
      queryClient.fetchQuery({
        queryKey: summaryKey,
        queryFn: () => getBusinessOrderSummary(businessId),
        staleTime,
      }),
      queryClient.fetchQuery({
        queryKey: fullListKey,
        queryFn: ({ signal }) => listBusinessOrdersWithQuery(businessId, undefined, { signal }),
        staleTime,
      }),
    ]);

    const previousOrders = queryClient.getQueryData<Order[]>(kitchenListKey);
    const changes = detectOrderListChanges(previousOrders, orders);

    if (!orderListsEqual(previousOrders, orders)) {
      queryClient.setQueryData(kitchenListKey, orders);
    }

    const previousSummary = queryClient.getQueryData<BusinessOrderSummary>(summaryKey);
    if (!orderSummariesEqual(previousSummary, summary)) {
      queryClient.setQueryData(summaryKey, summary);
    }

    return { orders, summary, changes };
  } catch (error) {
    if (!isQueryCancellationError(error)) throw error;

    const orders = queryClient.getQueryData<Order[]>(kitchenListKey) ?? [];
    const summary =
      queryClient.getQueryData<BusinessOrderSummary>(summaryKey) ??
      ({
        todayCount: 0,
        pendingCount: 0,
        todayRevenue: 0,
        recentOrders: [],
      } satisfies BusinessOrderSummary);
    const changes = detectOrderListChanges(orders, orders);
    return { orders, summary, changes };
  }
}
