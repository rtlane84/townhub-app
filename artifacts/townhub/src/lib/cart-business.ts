export const CLEAR_CART_FOR_OTHER_BUSINESS_MESSAGE =
  "Your cart contains items from another business. Clear cart and start a new order?";

export type CartBusinessState<TItem> = {
  businessId: number | null;
  items: TItem[];
};

/**
 * Pure cart merge for add-to-cart. Callers must confirm before clearing another business.
 * Returns null when the add should be aborted (different business, not confirmed).
 */
export function mergeCartAdd<TItem extends { lineKey: string; quantity: number }>(
  prev: CartBusinessState<TItem>,
  businessId: number,
  line: TItem,
  options: { clearOtherBusinessConfirmed: boolean },
): CartBusinessState<TItem> | null {
  if (prev.businessId !== null && prev.businessId !== businessId) {
    if (!options.clearOtherBusinessConfirmed) {
      return null;
    }
    return { businessId, items: [line] };
  }

  const existing = prev.items.find((item) => item.lineKey === line.lineKey);
  if (existing) {
    return {
      ...prev,
      businessId,
      items: prev.items.map((item) =>
        item.lineKey === line.lineKey
          ? { ...item, quantity: item.quantity + line.quantity }
          : item,
      ),
    };
  }

  return {
    businessId,
    items: [...prev.items, line],
  };
}

export function needsClearCartConfirmation(
  cartBusinessId: number | null,
  nextBusinessId: number,
): boolean {
  return cartBusinessId !== null && cartBusinessId !== nextBusinessId;
}
