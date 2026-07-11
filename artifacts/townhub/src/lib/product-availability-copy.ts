/** Customer-facing copy for product availability (Phase 1 — not inventory). */

export function cartItemUnavailableMessage(productName: string): string {
  return `${productName} is no longer available. Remove it from your cart to continue.`;
}
