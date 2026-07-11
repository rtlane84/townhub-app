/**
 * Orders a business owner should see in dashboard / kitchen / reports.
 * Card (STRIPE) orders are only actionable once paid; pay-at-pickup shows immediately.
 */
export function isBusinessActionableOrder(
  paymentMethod: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  const method = paymentMethod ?? "STRIPE";
  if (method !== "STRIPE") return true;
  return paymentStatus === "PAID";
}

/** SQL fragment matching {@link isBusinessActionableOrder} (for Drizzle `sql` templates). */
export const BUSINESS_ACTIONABLE_ORDERS_SQL = `(coalesce(payment_method, 'STRIPE') <> 'STRIPE' OR payment_status = 'PAID')`;
