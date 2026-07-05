import type { SerializedOrder } from "./order-serialization-core";

export type BusinessOrderSummaryPayload = {
  todayCount: number;
  pendingCount: number;
  todayRevenue: number;
  upcomingCount: number;
  recentOrders: SerializedOrder[];
};

export function buildBusinessOrderSummaryPayload(input: {
  todayCount: number;
  pendingCount: number;
  todayRevenue: number;
  recentOrders: SerializedOrder[];
}): BusinessOrderSummaryPayload {
  return {
    todayCount: input.todayCount,
    pendingCount: input.pendingCount,
    todayRevenue: input.todayRevenue,
    upcomingCount: input.pendingCount,
    recentOrders: input.recentOrders,
  };
}
