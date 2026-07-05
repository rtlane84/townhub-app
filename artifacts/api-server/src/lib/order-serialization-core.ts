import { resolveOrderTotalsDisplay } from "@workspace/api-zod";
import { orderTotalCents } from "./order-refund-logic";
import type { SerializedOrderRefund } from "./order-refund";

export type OrderViewerContext = {
  includeRefundDetails: boolean;
};

export type SerializableOrderItemOption = {
  id: number;
  optionId: number | null;
  groupName: string;
  optionName: string;
  priceAdjustment: string | number;
};

export type SerializableOrderItem = {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
};

export type SerializableOrder = {
  id: number;
  businessId: number;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerUserId?: string | null;
  deliveryAddress?: string | null;
  pickupTime?: string | null;
  estimatedWindowStart?: Date | string | null;
  estimatedWindowEnd?: Date | string | null;
  notes?: string | null;
  specialFields?: string | null;
  subtotalCents: number | null;
  taxCents: number | null;
  taxLabel: string | null;
  taxRatePercent?: string | null;
  total: string;
  deliveryFee?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  stripeSessionId?: string | null;
  refundStatus?: string | null;
  refundedAmountCents?: number | null;
  lastRefundedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type SerializedOrder = ReturnType<typeof buildSerializedOrder>;

export function groupRowsByKey<T, K extends number>(
  rows: T[],
  key: (row: T) => K | undefined,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const id = key(row);
    if (id == null) continue;
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

export function buildSerializedOrder(
  order: SerializableOrder,
  items: SerializableOrderItem[],
  businessName: string,
  optionsByItemId: Map<number, SerializableOrderItemOption[]>,
  viewer: OrderViewerContext,
  refunds?: SerializedOrderRefund[],
) {
  const totalCents = orderTotalCents(order);
  const refundedCents = order.refundedAmountCents ?? 0;
  const remainingCents = Math.max(0, totalCents - refundedCents);
  const deliveryFee = order.deliveryFee ? parseFloat(order.deliveryFee) : null;
  const mappedItems = items.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: parseFloat(String(item.unitPrice)),
    subtotal: parseFloat(String(item.subtotal)),
    options: (optionsByItemId.get(item.id) ?? []).map((o) => ({
      id: o.id,
      optionId: o.optionId,
      groupName: o.groupName,
      optionName: o.optionName,
      priceAdjustment: parseFloat(String(o.priceAdjustment)),
    })),
  }));
  const totals = resolveOrderTotalsDisplay({
    subtotalCents: order.subtotalCents ?? 0,
    taxCents: order.taxCents ?? 0,
    taxLabel: order.taxLabel,
    deliveryFee,
    total: parseFloat(order.total),
    items: mappedItems,
  });

  const base = {
    id: order.id,
    businessId: order.businessId,
    businessName,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerUserId: order.customerUserId,
    deliveryAddress: order.deliveryAddress,
    pickupTime: order.pickupTime,
    estimatedWindowStart:
      order.estimatedWindowStart instanceof Date
        ? order.estimatedWindowStart.toISOString()
        : order.estimatedWindowStart,
    estimatedWindowEnd:
      order.estimatedWindowEnd instanceof Date
        ? order.estimatedWindowEnd.toISOString()
        : order.estimatedWindowEnd,
    notes: order.notes,
    specialFields: order.specialFields,
    subtotal: totals.subtotal,
    tax: totals.tax,
    taxRatePercent: order.taxRatePercent ? parseFloat(order.taxRatePercent) : null,
    taxLabel: totals.taxLabel,
    total: totals.total,
    deliveryFee,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    stripeSessionId: order.stripeSessionId,
    refundStatus: order.refundStatus ?? "NONE",
    refundedAmount: refundedCents / 100,
    refundableAmount: remainingCents / 100,
    items: mappedItems,
    createdAt:
      order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt,
  };

  if (!viewer.includeRefundDetails) {
    return base;
  }

  return {
    ...base,
    lastRefundedAt: order.lastRefundedAt
      ? order.lastRefundedAt instanceof Date
        ? order.lastRefundedAt.toISOString()
        : String(order.lastRefundedAt)
      : null,
    refunds: refunds ?? [],
  };
}
