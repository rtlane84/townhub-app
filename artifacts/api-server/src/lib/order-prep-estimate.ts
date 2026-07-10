import type { PrepEstimateItem } from "@workspace/api-zod";
import { calculateAsapPrepEstimate } from "@workspace/api-zod";
import type { productsTable } from "@workspace/db";

export type OrderPrepLineItem = {
  productId: number;
  quantity: number;
};

export function buildPrepEstimateItems(
  lineItems: OrderPrepLineItem[],
  productMap: Map<number, typeof productsTable.$inferSelect>,
): PrepEstimateItem[] {
  return lineItems.map((item) => {
    const product = productMap.get(item.productId);
    return {
      quantity: item.quantity,
      prepTimeMinutes: product?.prepTimeMinutes ?? null,
    };
  });
}

export function calculateOrderPrepEstimate(input: {
  defaultPrepMinutes?: number | null;
  deliveryBufferMinutes?: number | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
  lineItems: OrderPrepLineItem[];
  productMap: Map<number, typeof productsTable.$inferSelect>;
  orderedAt?: Date;
}) {
  return calculateAsapPrepEstimate({
    defaultPrepMinutes: input.defaultPrepMinutes,
    deliveryBufferMinutes: input.deliveryBufferMinutes,
    fulfillmentType: input.fulfillmentType,
    items: buildPrepEstimateItems(input.lineItems, input.productMap),
    orderedAt: input.orderedAt,
  });
}

export function serializePrepEstimate(estimate: ReturnType<typeof calculateAsapPrepEstimate>) {
  return {
    centerMinutes: estimate.centerMinutes,
    minMinutes: estimate.minMinutes,
    maxMinutes: estimate.maxMinutes,
    estimatedWindowStart: estimate.estimatedWindowStart.toISOString(),
    estimatedWindowEnd: estimate.estimatedWindowEnd.toISOString(),
  };
}
