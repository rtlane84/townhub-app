/** Shared product orderability checks (owner-controlled `available`, not inventory). */

export const PRODUCT_UNAVAILABLE_CODE = "PRODUCT_UNAVAILABLE" as const;

export function productUnavailableOrderMessage(productName: string): string {
  return `${productName} is no longer available`;
}

export type ProductAvailabilityResult =
  | { ok: true }
  | { ok: false; code: typeof PRODUCT_UNAVAILABLE_CODE; error: string };

/** Reject ordering when the owner has marked the product unavailable. */
export function assertProductAvailableForOrder(product: {
  name: string;
  available?: boolean | null;
}): ProductAvailabilityResult {
  if (product.available === false) {
    return {
      ok: false,
      code: PRODUCT_UNAVAILABLE_CODE,
      error: productUnavailableOrderMessage(product.name),
    };
  }
  return { ok: true };
}
