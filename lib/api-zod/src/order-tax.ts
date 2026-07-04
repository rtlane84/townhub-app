export const DEFAULT_TAX_LABEL = "Sales Tax";

export type OrderTaxLineInput = {
  lineSubtotalCents: number;
  taxable: boolean;
};

export type CalculateOrderTotalsInput = {
  items: OrderTaxLineInput[];
  taxEnabled: boolean;
  taxRatePercent: number;
  taxLabel?: string;
  deliveryFeeCents: number;
};

export type OrderTotalsResult = {
  subtotalCents: number;
  taxableSubtotalCents: number;
  taxCents: number;
  taxRatePercent: number | null;
  taxLabel: string | null;
  deliveryFeeCents: number;
  totalCents: number;
};

export type OrderTotalsDisplay = {
  subtotal: number;
  tax: number;
  taxLabel: string | null;
  deliveryFee: number | null;
  total: number;
};

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function calculateOrderTaxCents(
  taxableSubtotalCents: number,
  taxRatePercent: number,
): number {
  if (taxableSubtotalCents <= 0 || taxRatePercent <= 0) return 0;
  return Math.round((taxableSubtotalCents * taxRatePercent) / 100);
}

export function calculateOrderTotals(input: CalculateOrderTotalsInput): OrderTotalsResult {
  const subtotalCents = input.items.reduce((sum, item) => sum + item.lineSubtotalCents, 0);
  const taxableSubtotalCents = input.items.reduce(
    (sum, item) => sum + (item.taxable ? item.lineSubtotalCents : 0),
    0,
  );

  const label = input.taxLabel?.trim() || DEFAULT_TAX_LABEL;
  const taxCents =
    input.taxEnabled && input.taxRatePercent > 0
      ? calculateOrderTaxCents(taxableSubtotalCents, input.taxRatePercent)
      : 0;

  return {
    subtotalCents,
    taxableSubtotalCents,
    taxCents,
    taxRatePercent: taxCents > 0 ? input.taxRatePercent : null,
    taxLabel: taxCents > 0 ? label : null,
    deliveryFeeCents: input.deliveryFeeCents,
    totalCents: subtotalCents + taxCents + input.deliveryFeeCents,
  };
}

export function resolveOrderTotalsDisplay(order: {
  subtotalCents?: number | null;
  taxCents?: number | null;
  taxLabel?: string | null;
  deliveryFee?: number | null;
  total: number;
  items?: Array<{ subtotal: number }>;
}): OrderTotalsDisplay {
  if (order.subtotalCents != null) {
    const deliveryFee =
      order.deliveryFee != null && order.deliveryFee > 0 ? order.deliveryFee : null;
    return {
      subtotal: centsToDollars(order.subtotalCents),
      tax: centsToDollars(order.taxCents ?? 0),
      taxLabel: order.taxLabel ?? null,
      deliveryFee,
      total: order.total,
    };
  }

  const deliveryFee =
    order.deliveryFee != null && order.deliveryFee > 0 ? order.deliveryFee : null;
  const itemsSubtotal =
    order.items?.reduce((sum, item) => sum + item.subtotal, 0) ??
    order.total - (deliveryFee ?? 0);

  return {
    subtotal: itemsSubtotal,
    tax: 0,
    taxLabel: null,
    deliveryFee,
    total: order.total,
  };
}

export function resolveDisplayedOrderTotals(order: {
  subtotal?: number | null;
  tax?: number | null;
  taxLabel?: string | null;
  deliveryFee?: number | null;
  total: number;
  items?: Array<{ subtotal: number }>;
}): OrderTotalsDisplay {
  return resolveOrderTotalsDisplay({
    subtotalCents: order.subtotal != null ? Math.round(order.subtotal * 100) : null,
    taxCents: order.tax != null ? Math.round(order.tax * 100) : null,
    taxLabel: order.taxLabel,
    deliveryFee: order.deliveryFee,
    total: order.total,
    items: order.items,
  });
}

export function buildStripeCheckoutLineItems(order: {
  items: Array<{ productName: string; unitPrice: number; quantity: number }>;
  deliveryFee?: number | null;
  tax?: number | null;
  taxLabel?: string | null;
}): Array<{ name: string; unitAmountCents: number; quantity: number }> {
  const lineItems = order.items.map((item) => ({
    name: item.productName,
    unitAmountCents: dollarsToCents(item.unitPrice),
    quantity: item.quantity,
  }));

  if (order.deliveryFee != null && order.deliveryFee > 0) {
    lineItems.push({
      name: "Delivery Fee",
      unitAmountCents: dollarsToCents(order.deliveryFee),
      quantity: 1,
    });
  }

  if (order.tax != null && order.tax > 0) {
    lineItems.push({
      name: order.taxLabel?.trim() || DEFAULT_TAX_LABEL,
      unitAmountCents: dollarsToCents(order.tax),
      quantity: 1,
    });
  }

  return lineItems;
}
